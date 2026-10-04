package com.nextmail.controlled;

import com.nextmail.mail.Message;
import com.nextmail.mail.MessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ControlledEnvelopeServiceTest {

    @Mock
    private ControlledEnvelopeRepository envelopeRepository;

    @Mock
    private EnvelopeAuditLogRepository auditLogRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private ControlledEnvelopeService service;

    private UUID senderId;
    private UUID messageId;
    private Message testMessage;

    @BeforeEach
    void setUp() {
        service = new ControlledEnvelopeService(
                envelopeRepository,
                auditLogRepository,
                messageRepository,
                Optional.of(messagingTemplate)
        );

        senderId = UUID.randomUUID();
        messageId = UUID.randomUUID();

        testMessage = Message.builder()
                .id(messageId)
                .userId(senderId)
                .senderEmail("alex@nextmail.local")
                .subject("Confidential M&A Term Sheet")
                .bodyText("Confidential valuation parameters...")
                .sentAt(Instant.now())
                .receivedAt(Instant.now())
                .build();
    }

    @Test
    @DisplayName("Should create Controlled Envelope with specified expiry hours and flags")
    void testCreateEnvelope() {
        when(envelopeRepository.save(any(ControlledEnvelope.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ControlledEnvelope envelope = service.createEnvelope(testMessage, 24, false, false, true);

        assertThat(envelope).isNotNull();
        assertThat(envelope.getMessageId()).isEqualTo(messageId);
        assertThat(envelope.getSenderId()).isEqualTo(senderId);
        assertThat(envelope.getSenderEmail()).isEqualTo("alex@nextmail.local");
        assertThat(envelope.isRevoked()).isFalse();
        assertThat(envelope.isAllowForwarding()).isFalse();
        assertThat(envelope.isAllowPrinting()).isFalse();
        assertThat(envelope.isWatermarkRecipient()).isTrue();
        assertThat(envelope.getExpiresAt()).isAfter(Instant.now().plus(23, ChronoUnit.HOURS));

        verify(envelopeRepository).save(any(ControlledEnvelope.class));
    }

    @Test
    @DisplayName("Sender should successfully revoke an active controlled envelope")
    void testRevokeEnvelope_SenderAuthorized() {
        ControlledEnvelope envelope = ControlledEnvelope.builder()
                .id(UUID.randomUUID())
                .messageId(messageId)
                .senderId(senderId)
                .senderEmail("alex@nextmail.local")
                .expiresAt(Instant.now().plus(48, ChronoUnit.HOURS))
                .isRevoked(false)
                .build();

        when(envelopeRepository.findByMessageId(messageId)).thenReturn(Optional.of(envelope));
        when(envelopeRepository.save(any(ControlledEnvelope.class))).thenAnswer(inv -> inv.getArgument(0));

        ControlledEnvelope revoked = service.revokeEnvelope(senderId, messageId, "Sensitive deal renegotiated");

        assertThat(revoked.isRevoked()).isTrue();
        assertThat(revoked.getRevokeReason()).isEqualTo("Sensitive deal renegotiated");
        assertThat(revoked.getRevokedAt()).isNotNull();

        verify(auditLogRepository).save(any(EnvelopeAuditLog.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/message/" + messageId + "/controlled"), any(Object.class));
    }

    @Test
    @DisplayName("Non-sender attempting revocation should throw SecurityException")
    void testRevokeEnvelope_Unauthorized() {
        UUID unauthorizedUserId = UUID.randomUUID();
        ControlledEnvelope envelope = ControlledEnvelope.builder()
                .id(UUID.randomUUID())
                .messageId(messageId)
                .senderId(senderId)
                .senderEmail("alex@nextmail.local")
                .expiresAt(Instant.now().plus(48, ChronoUnit.HOURS))
                .build();

        when(envelopeRepository.findByMessageId(messageId)).thenReturn(Optional.of(envelope));

        assertThatThrownBy(() -> service.revokeEnvelope(unauthorizedUserId, messageId, "Unauthorized attempt"))
                .isInstanceOf(SecurityException.class)
                .hasMessageContaining("Only the sender can revoke access");
    }

    @Test
    @DisplayName("Zero-trust shredder should securely shred expired envelope message bodies")
    void testShredExpiredPayloads() {
        ControlledEnvelope expiredEnvelope = ControlledEnvelope.builder()
                .id(UUID.randomUUID())
                .messageId(messageId)
                .senderId(senderId)
                .senderEmail("alex@nextmail.local")
                .expiresAt(Instant.now().minus(1, ChronoUnit.HOURS))
                .isPayloadShredded(false)
                .build();

        when(envelopeRepository.findByExpiresAtBeforeAndIsPayloadShreddedFalse(any(Instant.class)))
                .thenReturn(List.of(expiredEnvelope));
        when(messageRepository.findById(messageId)).thenReturn(Optional.of(testMessage));

        service.shredExpiredPayloads();

        assertThat(testMessage.getBodyText()).contains("[CONTROLLED ENVELOPE EXPIRED]");
        assertThat(testMessage.getBodyHtml()).isNull();
        assertThat(expiredEnvelope.isPayloadShredded()).isTrue();

        verify(messageRepository).save(testMessage);
        verify(envelopeRepository).save(expiredEnvelope);
    }
}
