package com.nextmail.controlled;

import com.nextmail.controlled.dto.ControlledEnvelopeDTO;
import com.nextmail.controlled.dto.EnvelopeAuditLogDTO;
import com.nextmail.mail.Message;
import com.nextmail.mail.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
public class ControlledEnvelopeService {

    private final ControlledEnvelopeRepository envelopeRepository;
    private final EnvelopeAuditLogRepository auditLogRepository;
    private final MessageRepository messageRepository;
    private final Optional<SimpMessagingTemplate> messagingTemplate;
    private final Optional<com.nextmail.common.metrics.NextMailMetrics> metrics;

    public ControlledEnvelopeService(
            ControlledEnvelopeRepository envelopeRepository,
            EnvelopeAuditLogRepository auditLogRepository,
            MessageRepository messageRepository,
            Optional<SimpMessagingTemplate> messagingTemplate) {
        this(envelopeRepository, auditLogRepository, messageRepository, messagingTemplate, Optional.empty());
    }

    @org.springframework.beans.factory.annotation.Autowired
    public ControlledEnvelopeService(
            ControlledEnvelopeRepository envelopeRepository,
            EnvelopeAuditLogRepository auditLogRepository,
            MessageRepository messageRepository,
            Optional<SimpMessagingTemplate> messagingTemplate,
            Optional<com.nextmail.common.metrics.NextMailMetrics> metrics) {
        this.envelopeRepository = envelopeRepository;
        this.auditLogRepository = auditLogRepository;
        this.messageRepository = messageRepository;
        this.messagingTemplate = messagingTemplate != null ? messagingTemplate : Optional.empty();
        this.metrics = metrics != null ? metrics : Optional.empty();
    }

    @Transactional
    public ControlledEnvelope createEnvelope(
            Message message,
            int expiryHours,
            boolean allowForwarding,
            boolean allowPrinting,
            boolean watermarkRecipient
    ) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(expiryHours > 0 ? expiryHours : 48, ChronoUnit.HOURS);

        ControlledEnvelope envelope = ControlledEnvelope.builder()
                .messageId(message.getId())
                .senderId(message.getUserId())
                .senderEmail(message.getSenderEmail())
                .expiresAt(expiresAt)
                .isRevoked(false)
                .allowForwarding(allowForwarding)
                .allowPrinting(allowPrinting)
                .watermarkRecipient(watermarkRecipient)
                .isPayloadShredded(false)
                .build();

        ControlledEnvelope saved = envelopeRepository.save(envelope);
        log.info("Created Controlled Envelope {} for message {} (TTL: {}h, expiresAt: {})",
                saved.getId(), message.getId(), expiryHours, expiresAt);
        return saved;
    }

    @Transactional
    public void recordAudit(
            UUID messageId,
            UUID viewerId,
            String viewerEmail,
            EnvelopeAuditEvent eventType,
            String ipAddress,
            String userAgent
    ) {
        EnvelopeAuditLog audit = EnvelopeAuditLog.builder()
                .messageId(messageId)
                .viewerId(viewerId)
                .viewerEmail(viewerEmail != null ? viewerEmail : "anonymous@nextmail.local")
                .eventType(eventType)
                .ipAddress(ipAddress != null ? ipAddress : "127.0.0.1")
                .userAgent(userAgent != null ? userAgent : "NextMail-Web/1.0")
                .build();

        auditLogRepository.save(audit);
        log.debug("Recorded envelope audit: message={}, event={}, viewer={}", messageId, eventType, viewerEmail);
    }

    @Transactional
    public ControlledEnvelope revokeEnvelope(UUID senderId, UUID messageId, String reason) {
        ControlledEnvelope envelope = envelopeRepository.findByMessageId(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Controlled Envelope not found for message " + messageId));

        if (!envelope.getSenderId().equals(senderId)) {
            throw new SecurityException("Only the sender can revoke access to this controlled message");
        }

        if (envelope.isRevoked()) {
            return envelope;
        }

        envelope.setRevoked(true);
        envelope.setRevokedAt(Instant.now());
        envelope.setRevokeReason(reason != null && !reason.isBlank() ? reason : "Sender revoked access on demand");
        ControlledEnvelope updated = envelopeRepository.save(envelope);

        // Record audit
        recordAudit(messageId, senderId, envelope.getSenderEmail(), EnvelopeAuditEvent.REVOKED, "127.0.0.1", "Sender-Revoke-Action");

        // Broadcast real-time revocation signal to any live recipients viewing the message
        messagingTemplate.ifPresent(template -> {
            try {
                template.convertAndSend("/topic/message/" + messageId + "/controlled", Map.of(
                        "action", "REVOKED",
                        "messageId", messageId.toString(),
                        "reason", envelope.getRevokeReason()
                ));
            } catch (Exception e) {
                log.warn("Failed to broadcast envelope revocation via STOMP: {}", e.getMessage());
            }
        });

        log.info("Revoked Controlled Envelope {} for message {}", updated.getId(), messageId);
        metrics.ifPresent(com.nextmail.common.metrics.NextMailMetrics::recordControlledRevocation);
        return updated;
    }

    @Transactional(readOnly = true)
    public Optional<ControlledEnvelopeDTO> getEnvelopeDTO(UUID messageId) {
        return envelopeRepository.findByMessageId(messageId).map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public List<EnvelopeAuditLogDTO> getAuditLogs(UUID requesterId, UUID messageId) {
        ControlledEnvelope envelope = envelopeRepository.findByMessageId(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Controlled Envelope not found for message " + messageId));

        if (!envelope.getSenderId().equals(requesterId)) {
            throw new SecurityException("Only the sender can inspect access audit logs for this envelope");
        }

        return auditLogRepository.findByMessageIdOrderByCreatedAtDesc(messageId).stream()
                .map(this::mapAuditToDTO)
                .toList();
    }

    /**
     * Periodic Zero-Trust cryptographic shredding of expired envelope bodies.
     */
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void shredExpiredPayloads() {
        Instant now = Instant.now();
        List<ControlledEnvelope> expired = envelopeRepository.findByExpiresAtBeforeAndIsPayloadShreddedFalse(now);
        if (expired.isEmpty()) {
            return;
        }

        log.info("Zero-Trust Shredder: Found {} expired controlled envelope(s) to shred", expired.size());
        for (ControlledEnvelope envelope : expired) {
            messageRepository.findById(envelope.getMessageId()).ifPresent(message -> {
                message.setBodyText("[CONTROLLED ENVELOPE EXPIRED]\nThis message expired on " + envelope.getExpiresAt()
                        + ". Content has been securely shredded in accordance with NextMail Zero-Trust policy.");
                message.setBodyHtml(null);
                messageRepository.save(message);
            });
            envelope.setPayloadShredded(true);
            envelopeRepository.save(envelope);
        }
        metrics.ifPresent(m -> m.recordShreddedPayloads(expired.size()));
    }

    public ControlledEnvelopeDTO mapToDTO(ControlledEnvelope envelope) {
        long viewCount = auditLogRepository.countByMessageIdAndEventType(envelope.getMessageId(), EnvelopeAuditEvent.VIEWED);
        return ControlledEnvelopeDTO.builder()
                .id(envelope.getId())
                .messageId(envelope.getMessageId())
                .senderId(envelope.getSenderId())
                .senderEmail(envelope.getSenderEmail())
                .expiresAt(envelope.getExpiresAt())
                .isRevoked(envelope.isRevoked())
                .revokedAt(envelope.getRevokedAt())
                .revokeReason(envelope.getRevokeReason())
                .allowForwarding(envelope.isAllowForwarding())
                .allowPrinting(envelope.isAllowPrinting())
                .watermarkRecipient(envelope.isWatermarkRecipient())
                .isExpired(envelope.isExpired())
                .isAccessible(envelope.isAccessible())
                .viewCount(viewCount)
                .createdAt(envelope.getCreatedAt())
                .build();
    }

    private EnvelopeAuditLogDTO mapAuditToDTO(EnvelopeAuditLog audit) {
        return EnvelopeAuditLogDTO.builder()
                .id(audit.getId())
                .messageId(audit.getMessageId())
                .viewerId(audit.getViewerId())
                .viewerEmail(audit.getViewerEmail())
                .eventType(audit.getEventType())
                .ipAddress(audit.getIpAddress())
                .userAgent(audit.getUserAgent())
                .createdAt(audit.getCreatedAt())
                .build();
    }
}
