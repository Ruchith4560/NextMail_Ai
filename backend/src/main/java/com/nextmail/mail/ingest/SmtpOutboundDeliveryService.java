package com.nextmail.mail.ingest;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SmtpOutboundDeliveryService {

    private final JavaMailSender mailSender;

    public boolean dispatchSmtpMessage(
            String senderEmail,
            String senderName,
            List<String> toRecipients,
            List<String> ccRecipients,
            List<String> bccRecipients,
            String subject,
            String bodyText,
            String bodyHtml,
            String messageIdHeader,
            String inReplyTo,
            String references
    ) {
        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());

            helper.setFrom(senderEmail, senderName != null ? senderName : senderEmail);
            helper.setTo(toRecipients.toArray(new String[0]));

            if (ccRecipients != null && !ccRecipients.isEmpty()) {
                helper.setCc(ccRecipients.toArray(new String[0]));
            }
            if (bccRecipients != null && !bccRecipients.isEmpty()) {
                helper.setBcc(bccRecipients.toArray(new String[0]));
            }

            helper.setSubject(subject);

            if (bodyHtml != null && !bodyHtml.isBlank()) {
                helper.setText(bodyText != null ? bodyText : "", bodyHtml);
            } else {
                helper.setText(bodyText != null ? bodyText : "");
            }

            // Explicitly set RFC 5322 Threading Headers
            if (messageIdHeader != null) {
                mimeMessage.setHeader("Message-ID", messageIdHeader);
            }
            if (inReplyTo != null && !inReplyTo.isBlank()) {
                mimeMessage.setHeader("In-Reply-To", inReplyTo);
            }
            if (references != null && !references.isBlank()) {
                mimeMessage.setHeader("References", references);
            }

            mailSender.send(mimeMessage);
            log.info("Successfully dispatched outbound SMTP message {} to {}", messageIdHeader, toRecipients);
            return true;
        } catch (MessagingException ex) {
            log.error("Failed to construct RFC 5322 MIME message: {}", ex.getMessage());
            return false;
        } catch (Exception ex) {
            log.warn("SMTP host unavailable or send failed (Mock/Local mode active): {}", ex.getMessage());
            return false;
        }
    }
}
