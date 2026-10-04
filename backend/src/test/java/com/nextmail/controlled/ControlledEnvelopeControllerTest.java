package com.nextmail.controlled;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nextmail.auth.JwtTokenProvider;
import com.nextmail.auth.Role;
import com.nextmail.auth.User;
import com.nextmail.auth.UserRepository;
import com.nextmail.controlled.dto.RevokeEnvelopeRequest;
import com.nextmail.mail.Message;
import com.nextmail.mail.MessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ControlledEnvelopeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private ControlledEnvelopeRepository envelopeRepository;

    @Autowired
    private EnvelopeAuditLogRepository auditLogRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User senderUser;
    private String senderJwt;
    private Message testMessage;
    private ControlledEnvelope envelope;

    @BeforeEach
    void setUp() {
        auditLogRepository.deleteAll();
        envelopeRepository.deleteAll();
        messageRepository.deleteAll();
        userRepository.deleteAll();

        senderUser = User.builder()
                .email("alex.sender@nextmail.local")
                .passwordHash("DummyArgon2idHash")
                .fullName("Alex Sender")
                .role(Role.ROLE_USER)
                .build();
        senderUser = userRepository.save(senderUser);
        senderJwt = jwtTokenProvider.generateAccessToken(senderUser);

        testMessage = Message.builder()
                .threadId(UUID.randomUUID())
                .userId(senderUser.getId())
                .messageIdHeader("<controlled-test@nextmail.local>")
                .senderEmail(senderUser.getEmail())
                .senderName(senderUser.getFullName())
                .subject("Restricted Corporate Acquisition Specs")
                .bodyText("Confidential valuation data...")
                .sentAt(Instant.now())
                .receivedAt(Instant.now())
                .isControlled(true)
                .expiresAt(Instant.now().plus(48, ChronoUnit.HOURS))
                .build();
        testMessage = messageRepository.save(testMessage);

        envelope = ControlledEnvelope.builder()
                .messageId(testMessage.getId())
                .senderId(senderUser.getId())
                .senderEmail(senderUser.getEmail())
                .expiresAt(testMessage.getExpiresAt())
                .isRevoked(false)
                .allowForwarding(false)
                .allowPrinting(false)
                .watermarkRecipient(true)
                .build();
        envelope = envelopeRepository.save(envelope);
    }

    @Test
    @DisplayName("Get status without auth returns 401 Unauthorized")
    void getStatus_WithoutAuth_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/controlled/{messageId}/status", testMessage.getId()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Get status of existing controlled envelope returns DTO with security policies")
    void getStatus_WithAuth_ReturnsStatus() throws Exception {
        mockMvc.perform(get("/api/v1/controlled/{messageId}/status", testMessage.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + senderJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.messageId").value(testMessage.getId().toString()))
                .andExpect(jsonPath("$.data.isRevoked").value(false))
                .andExpect(jsonPath("$.data.allowForwarding").value(false))
                .andExpect(jsonPath("$.data.allowPrinting").value(false))
                .andExpect(jsonPath("$.data.watermarkRecipient").value(true));
    }

    @Test
    @DisplayName("Sender revokes controlled envelope successfully")
    void revokeEnvelope_AsSender_Succeeds() throws Exception {
        RevokeEnvelopeRequest request = new RevokeEnvelopeRequest("Terms canceled by legal counsel");

        mockMvc.perform(post("/api/v1/controlled/{messageId}/revoke", testMessage.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + senderJwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.isRevoked").value(true))
                .andExpect(jsonPath("$.data.revokeReason").value("Terms canceled by legal counsel"));

        ControlledEnvelope updated = envelopeRepository.findByMessageId(testMessage.getId()).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(updated.isRevoked()).isTrue();
    }

    @Test
    @DisplayName("Sender retrieves audit logs for controlled envelope")
    void getAuditLogs_AsSender_ReturnsList() throws Exception {
        EnvelopeAuditLog audit1 = EnvelopeAuditLog.builder()
                .messageId(testMessage.getId())
                .viewerEmail("partner@acme-corp.com")
                .eventType(EnvelopeAuditEvent.VIEWED)
                .ipAddress("198.51.100.42")
                .userAgent("Mozilla/5.0")
                .build();
        auditLogRepository.save(audit1);

        mockMvc.perform(get("/api/v1/controlled/{messageId}/audit-logs", testMessage.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + senderJwt))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].viewerEmail").value("partner@acme-corp.com"))
                .andExpect(jsonPath("$.data[0].eventType").value("VIEWED"));
    }
}
