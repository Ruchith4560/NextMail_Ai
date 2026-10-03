package com.nextmail.mail;

import com.nextmail.mail.dto.*;
import com.nextmail.thread.JwzThreadingService;
import com.nextmail.thread.Thread;
import com.nextmail.thread.ThreadRepository;
import com.nextmail.thread.dto.ThreadDetailResponse;
import com.nextmail.thread.dto.ThreadSummaryResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MailService {

    private final ThreadRepository threadRepository;
    private final MessageRepository messageRepository;
    private final DraftRepository draftRepository;
    private final JwzThreadingService threadingService;
    private final com.nextmail.mail.ingest.SmtpOutboundDeliveryService smtpDeliveryService;
    private final com.nextmail.attachment.AttachmentService attachmentService;

    @Transactional(readOnly = true)
    public Page<ThreadSummaryResponse> getThreads(UUID userId, MailFolder folder, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)));
        Page<Thread> threadsPage = switch (folder) {
            case STARRED -> threadRepository.findByUserIdAndIsStarredTrueAndIsTrashFalseOrderByLastMessageAtDesc(userId, pageable);
            case ARCHIVE -> threadRepository.findByUserIdAndIsArchivedTrueAndIsTrashFalseOrderByLastMessageAtDesc(userId, pageable);
            case TRASH -> threadRepository.findByUserIdAndIsTrashTrueOrderByLastMessageAtDesc(userId, pageable);
            case SPAM -> threadRepository.findByUserIdAndIsSpamTrueOrderByLastMessageAtDesc(userId, pageable);
            default -> threadRepository.findByUserIdAndIsTrashFalseAndIsSpamFalseAndIsArchivedFalseOrderByLastMessageAtDesc(userId, pageable);
        };

        return threadsPage.map(this::mapToThreadSummary);
    }

    @Transactional(readOnly = true)
    public ThreadDetailResponse getThreadDetail(UUID userId, UUID threadId) {
        Thread thread = threadRepository.findByIdAndUserId(threadId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Thread not found with ID: " + threadId));

        List<Message> messages = messageRepository.findByThreadIdAndUserIdOrderBySentAtAsc(threadId, userId);

        return ThreadDetailResponse.builder()
                .id(thread.getId())
                .subject(thread.getSubject())
                .snippet(thread.getSnippet())
                .messageCount(thread.getMessageCount())
                .hasAttachments(thread.isHasAttachments())
                .firstMessageAt(thread.getFirstMessageAt())
                .lastMessageAt(thread.getLastMessageAt())
                .isRead(thread.isRead())
                .isStarred(thread.isStarred())
                .isArchived(thread.isArchived())
                .isSpam(thread.isSpam())
                .isTrash(thread.isTrash())
                .priorityTier(thread.getPriorityTier())
                .priorityScore(thread.getPriorityScore())
                .priorityReason(thread.getPriorityReason())
                .messages(messages.stream().map(this::mapToMessageDetail).toList())
                .build();
    }

    @Transactional
    public MessageDetailResponse sendMessage(UUID userId, String userEmail, String userName, SendMessageRequest request) {
        Instant now = Instant.now();
        String generatedMsgId = "<" + UUID.randomUUID() + "@nextmail.local>";

        String inReplyTo = request.getInReplyTo();
        String references = inReplyTo != null ? inReplyTo : "";

        // If threadId is provided, pull ancestor Message-ID from existing thread messages
        if (request.getThreadId() != null) {
            List<Message> existingMessages = messageRepository.findByThreadIdAndUserIdOrderBySentAtAsc(request.getThreadId(), userId);
            if (!existingMessages.isEmpty()) {
                Message lastMsg = existingMessages.get(existingMessages.size() - 1);
                inReplyTo = lastMsg.getMessageIdHeader();
                references = lastMsg.getReferencesHeader() != null
                        ? lastMsg.getReferencesHeader() + " " + inReplyTo
                        : inReplyTo;
            }
        }

        // Generate snippet (first 140 chars)
        String snippet = request.getBodyText().length() > 140
                ? request.getBodyText().substring(0, 137) + "..."
                : request.getBodyText();

        // 1. Resolve or link to thread using JWZ Threading Engine
        Thread thread = threadingService.resolveOrCreateThread(
                userId,
                request.getSubject(),
                inReplyTo,
                references,
                snippet,
                now,
                false
        );

        // 2. Compute expiry timestamp if Controlled Envelope is enabled
        Instant expiresAt = null;
        if (request.isControlled()) {
            int hours = request.getExpiryHours() != null ? request.getExpiryHours() : 48;
            expiresAt = now.plus(hours, ChronoUnit.HOURS);
        }

        // 3. Create outbound Message record
        Message message = Message.builder()
                .threadId(thread.getId())
                .userId(userId)
                .messageIdHeader(generatedMsgId)
                .inReplyTo(inReplyTo)
                .referencesHeader(references)
                .senderEmail(userEmail)
                .senderName(userName)
                .subject(request.getSubject())
                .bodyText(request.getBodyText())
                .bodyHtml(request.getBodyHtml())
                .sentAt(now)
                .receivedAt(now)
                .isRead(true)
                .isStarred(false)
                .isControlled(request.isControlled())
                .expiresAt(expiresAt)
                .folder(MailFolder.SENT)
                .build();

        // Add recipients
        for (String to : request.getTo()) {
            message.addRecipient(MessageRecipient.builder().type(RecipientType.TO).email(to.trim()).build());
        }
        if (request.getCc() != null) {
            for (String cc : request.getCc()) {
                message.addRecipient(MessageRecipient.builder().type(RecipientType.CC).email(cc.trim()).build());
            }
        }
        if (request.getBcc() != null) {
            for (String bcc : request.getBcc()) {
                message.addRecipient(MessageRecipient.builder().type(RecipientType.BCC).email(bcc.trim()).build());
            }
        }

        Message savedMessage = messageRepository.save(message);
        log.info("Saved outbound message {} in thread {}", savedMessage.getId(), thread.getId());

        // Link any uploaded attachments
        if (request.getAttachmentIds() != null && !request.getAttachmentIds().isEmpty()) {
            attachmentService.linkAttachmentsToMessage(request.getAttachmentIds(), savedMessage.getId());
            savedMessage.setHasAttachments(true);
            messageRepository.save(savedMessage);
            thread.setHasAttachments(true);
            threadRepository.save(thread);
        }

        // Dispatch outbound SMTP asynchronously (fails gracefully if SMTP host is offline in local dev)
        smtpDeliveryService.dispatchSmtpMessage(
                userEmail,
                userName,
                request.getTo(),
                request.getCc(),
                request.getBcc(),
                request.getSubject(),
                request.getBodyText(),
                request.getBodyHtml(),
                generatedMsgId,
                inReplyTo,
                references
        );

        return mapToMessageDetail(savedMessage);
    }


    @Transactional
    public void markThreadRead(UUID userId, UUID threadId, boolean isRead) {
        Thread thread = threadRepository.findByIdAndUserId(threadId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Thread not found"));
        thread.setRead(isRead);
        threadRepository.save(thread);
    }

    @Transactional
    public void toggleThreadStar(UUID userId, UUID threadId) {
        Thread thread = threadRepository.findByIdAndUserId(threadId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Thread not found"));
        thread.setStarred(!thread.isStarred());
        threadRepository.save(thread);
    }

    @Transactional
    public void archiveThread(UUID userId, UUID threadId) {
        Thread thread = threadRepository.findByIdAndUserId(threadId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Thread not found"));
        thread.setArchived(true);
        threadRepository.save(thread);
    }

    @Transactional
    public void trashThread(UUID userId, UUID threadId) {
        Thread thread = threadRepository.findByIdAndUserId(threadId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Thread not found"));
        thread.setTrash(true);
        threadRepository.save(thread);
    }

    @Transactional
    public Draft saveDraft(UUID userId, SaveDraftRequest request) {
        Draft draft;
        if (request.getId() != null) {
            draft = draftRepository.findByIdAndUserId(request.getId(), userId)
                    .orElse(new Draft());
        } else {
            draft = new Draft();
        }

        draft.setUserId(userId);
        draft.setThreadId(request.getThreadId());
        draft.setToRecipients(request.getToRecipients());
        draft.setCcRecipients(request.getCcRecipients());
        draft.setBccRecipients(request.getBccRecipients());
        draft.setSubject(request.getSubject());
        draft.setBodyText(request.getBodyText());
        draft.setControlled(request.isControlled());
        draft.setExpiryHours(request.getExpiryHours() != null ? request.getExpiryHours() : 48);

        return draftRepository.save(draft);
    }

    @Transactional(readOnly = true)
    public Page<Draft> getDrafts(UUID userId, int page, int size) {
        return draftRepository.findByUserIdOrderByUpdatedAtDesc(userId, PageRequest.of(page, size));
    }

    @Transactional
    public void deleteDraft(UUID userId, UUID draftId) {
        draftRepository.deleteByIdAndUserId(draftId, userId);
    }

    private ThreadSummaryResponse mapToThreadSummary(Thread thread) {
        return ThreadSummaryResponse.builder()
                .id(thread.getId())
                .subject(thread.getSubject())
                .snippet(thread.getSnippet())
                .messageCount(thread.getMessageCount())
                .hasAttachments(thread.isHasAttachments())
                .lastMessageAt(thread.getLastMessageAt())
                .isRead(thread.isRead())
                .isStarred(thread.isStarred())
                .isArchived(thread.isArchived())
                .isSpam(thread.isSpam())
                .isTrash(thread.isTrash())
                .priorityTier(thread.getPriorityTier())
                .priorityScore(thread.getPriorityScore())
                .priorityReason(thread.getPriorityReason())
                .build();
    }

    private MessageDetailResponse mapToMessageDetail(Message message) {
        List<com.nextmail.attachment.dto.AttachmentResponseDTO> attachments =
                attachmentService.getAttachmentsByMessage(message.getId());

        return MessageDetailResponse.builder()
                .id(message.getId())
                .threadId(message.getThreadId())
                .messageIdHeader(message.getMessageIdHeader())
                .inReplyTo(message.getInReplyTo())
                .senderEmail(message.getSenderEmail())
                .senderName(message.getSenderName())
                .subject(message.getSubject())
                .bodyText(message.getBodyText())
                .bodyHtml(message.getBodyHtml())
                .sentAt(message.getSentAt())
                .receivedAt(message.getReceivedAt())
                .isRead(message.isRead())
                .isStarred(message.isStarred())
                .isDraft(message.isDraft())
                .isControlled(message.isControlled())
                .expiresAt(message.getExpiresAt())
                .folder(message.getFolder())
                .hasAttachments(message.isHasAttachments() || (attachments != null && !attachments.isEmpty()))
                .recipients(message.getRecipients().stream()
                        .map(r -> MessageRecipientDTO.builder()
                                .type(r.getType())
                                .email(r.getEmail())
                                .name(r.getName())
                                .build())
                        .toList())
                .attachments(attachments)
                .build();
    }
}

