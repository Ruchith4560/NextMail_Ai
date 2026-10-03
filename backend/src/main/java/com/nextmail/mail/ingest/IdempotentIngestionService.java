package com.nextmail.mail.ingest;

import com.nextmail.mail.MailFolder;
import com.nextmail.mail.Message;
import com.nextmail.mail.MessageRecipient;
import com.nextmail.mail.MessageRepository;
import com.nextmail.mail.dto.MessageRecipientDTO;
import com.nextmail.mail.event.EmailIngestedEvent;
import com.nextmail.thread.JwzThreadingService;
import com.nextmail.thread.Thread;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class IdempotentIngestionService {

    private final MessageRepository messageRepository;
    private final JwzThreadingService threadingService;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public Message ingestEmail(UUID userId, NormalizedEmail normalized) {
        String messageId = normalized.getMessageIdHeader();

        // 1. Idempotency Check: Prevent duplicate ingestion on network retries or IMAP re-syncs
        Optional<Message> existing = messageRepository.findByMessageIdHeaderAndUserId(messageId, userId);
        if (existing.isPresent()) {
            log.info("Idempotent check: Message {} already exists for user {}. Skipping ingestion.", messageId, userId);
            return existing.get();
        }

        // 2. Prepare snippet for thread list preview
        String rawBody = normalized.getBodyText() != null ? normalized.getBodyText() : "";
        String snippet = rawBody.length() > 140 ? rawBody.substring(0, 137) + "..." : rawBody;

        // 3. Resolve or link into thread via JWZ Threading Engine
        Thread thread = threadingService.resolveOrCreateThread(
                userId,
                normalized.getSubject(),
                normalized.getInReplyTo(),
                normalized.getReferencesHeader(),
                snippet,
                normalized.getReceivedAt(),
                normalized.isHasAttachments()
        );

        // 4. Create and persist Message entity
        Message message = Message.builder()
                .threadId(thread.getId())
                .userId(userId)
                .messageIdHeader(messageId)
                .inReplyTo(normalized.getInReplyTo())
                .referencesHeader(normalized.getReferencesHeader())
                .senderEmail(normalized.getSenderEmail())
                .senderName(normalized.getSenderName())
                .subject(normalized.getSubject())
                .bodyText(normalized.getBodyText())
                .bodyHtml(normalized.getBodyHtml())
                .sentAt(normalized.getSentAt())
                .receivedAt(normalized.getReceivedAt())
                .isRead(false)
                .isStarred(false)
                .isControlled(false)
                .folder(MailFolder.INBOX)
                .hasAttachments(normalized.isHasAttachments())
                .build();

        for (MessageRecipientDTO r : normalized.getRecipients()) {
            message.addRecipient(MessageRecipient.builder()
                    .type(r.getType())
                    .email(r.getEmail())
                    .name(r.getName())
                    .build());
        }

        Message saved = messageRepository.save(message);
        log.info("Successfully ingested message {} into thread {}", saved.getId(), thread.getId());

        // 5. Emit EmailIngestedEvent for decoupled async tasks (Search, AI, Notifications)
        eventPublisher.publishEvent(EmailIngestedEvent.builder()
                .messageId(saved.getId())
                .threadId(thread.getId())
                .userId(userId)
                .subject(saved.getSubject())
                .bodyText(saved.getBodyText())
                .senderEmail(saved.getSenderEmail())
                .sentAt(saved.getSentAt())
                .build());

        return saved;
    }
}
