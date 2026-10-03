package com.nextmail.mail.ingest;

import com.nextmail.mail.RecipientType;
import com.nextmail.mail.dto.MessageRecipientDTO;
import jakarta.mail.*;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Service
@Slf4j
public class MimeNormalizationService {

    public NormalizedEmail parseMime(InputStream mimeStream) throws MessagingException, IOException {
        Session session = Session.getDefaultInstance(new Properties());
        MimeMessage mimeMessage = new MimeMessage(session, mimeStream);
        return parseMimeMessage(mimeMessage);
    }

    public NormalizedEmail parseRawEml(String rawEml) throws MessagingException, IOException {
        try (InputStream stream = new ByteArrayInputStream(rawEml.getBytes(StandardCharsets.UTF_8))) {
            return parseMime(stream);
        }
    }

    public NormalizedEmail parseMimeMessage(MimeMessage message) throws MessagingException, IOException {
        String messageId = message.getMessageID();
        if (messageId == null || messageId.isBlank()) {
            messageId = "<generated-" + UUID.randomUUID() + "@nextmail.local>";
        }

        String[] inReplyToHeaders = message.getHeader("In-Reply-To");
        String inReplyTo = (inReplyToHeaders != null && inReplyToHeaders.length > 0) ? inReplyToHeaders[0].trim() : null;

        String[] referencesHeaders = message.getHeader("References");
        String references = (referencesHeaders != null && referencesHeaders.length > 0) ? String.join(" ", referencesHeaders).trim() : null;

        String subject = message.getSubject() != null ? message.getSubject() : "(No Subject)";

        // Extract sender
        String senderEmail = "unknown@nextmail.local";
        String senderName = "Unknown Sender";
        Address[] fromAddresses = message.getFrom();
        if (fromAddresses != null && fromAddresses.length > 0 && fromAddresses[0] instanceof InternetAddress internetAddress) {
            senderEmail = internetAddress.getAddress();
            senderName = internetAddress.getPersonal() != null ? internetAddress.getPersonal() : senderEmail;
        }

        // Extract recipients
        List<MessageRecipientDTO> recipients = new ArrayList<>();
        extractRecipients(message, Message.RecipientType.TO, RecipientType.TO, recipients);
        extractRecipients(message, Message.RecipientType.CC, RecipientType.CC, recipients);
        extractRecipients(message, Message.RecipientType.BCC, RecipientType.BCC, recipients);

        // Extract timestamps
        Instant sentAt = message.getSentDate() != null ? message.getSentDate().toInstant() : Instant.now();
        Instant receivedAt = message.getReceivedDate() != null ? message.getReceivedDate().toInstant() : Instant.now();

        // Extract body text, html, and attachment presence
        StringBuilder textBuilder = new StringBuilder();
        StringBuilder htmlBuilder = new StringBuilder();
        boolean[] hasAttachments = new boolean[]{false};

        extractBodyContent(message, textBuilder, htmlBuilder, hasAttachments);

        String textBody = textBuilder.toString().trim();
        String htmlBody = htmlBuilder.toString().trim();

        // If no plain text was found, derive from HTML
        if (textBody.isEmpty() && !htmlBody.isEmpty()) {
            textBody = stripHtml(htmlBody);
        }

        return NormalizedEmail.builder()
                .messageIdHeader(messageId)
                .inReplyTo(inReplyTo)
                .referencesHeader(references)
                .senderEmail(senderEmail)
                .senderName(senderName)
                .subject(subject)
                .bodyText(textBody)
                .bodyHtml(htmlBody.isEmpty() ? null : htmlBody)
                .sentAt(sentAt)
                .receivedAt(receivedAt)
                .hasAttachments(hasAttachments[0])
                .recipients(recipients)
                .build();
    }

    private void extractRecipients(
            MimeMessage message,
            Message.RecipientType mailType,
            RecipientType appType,
            List<MessageRecipientDTO> recipientList
    ) throws MessagingException {
        Address[] addresses = message.getRecipients(mailType);
        if (addresses != null) {
            for (Address addr : addresses) {
                if (addr instanceof InternetAddress internetAddress) {
                    recipientList.add(MessageRecipientDTO.builder()
                            .type(appType)
                            .email(internetAddress.getAddress())
                            .name(internetAddress.getPersonal())
                            .build());
                }
            }
        }
    }

    private void extractBodyContent(
            Part part,
            StringBuilder textBuilder,
            StringBuilder htmlBuilder,
            boolean[] hasAttachments
    ) throws MessagingException, IOException {
        String disposition = part.getDisposition();
        if (Part.ATTACHMENT.equalsIgnoreCase(disposition) ||
                (Part.INLINE.equalsIgnoreCase(disposition) && part.getFileName() != null)) {
            hasAttachments[0] = true;
            return;
        }

        if (part.isMimeType("text/plain")) {
            Object content = part.getContent();
            if (content instanceof String s) {
                textBuilder.append(s).append("\n");
            }
        } else if (part.isMimeType("text/html")) {
            Object content = part.getContent();
            if (content instanceof String s) {
                htmlBuilder.append(s).append("\n");
            }
        } else if (part.isMimeType("multipart/*")) {
            Multipart multipart = (Multipart) part.getContent();
            for (int i = 0; i < multipart.getCount(); i++) {
                extractBodyContent(multipart.getBodyPart(i), textBuilder, htmlBuilder, hasAttachments);
            }
        }
    }

    private String stripHtml(String html) {
        return html
                .replaceAll("(?i)<script.*?</script>", "")
                .replaceAll("(?i)<style.*?</style>", "")
                .replaceAll("<[^>]+>", " ")
                .replaceAll("&nbsp;", " ")
                .replaceAll("&amp;", "&")
                .replaceAll("&lt;", "<")
                .replaceAll("&gt;", ">")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
