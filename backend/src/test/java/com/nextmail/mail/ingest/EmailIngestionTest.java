package com.nextmail.mail.ingest;

import com.icegreen.greenmail.configuration.GreenMailConfiguration;
import com.icegreen.greenmail.junit5.GreenMailExtension;
import com.icegreen.greenmail.util.ServerSetupTest;
import com.nextmail.auth.JwtTokenProvider;
import com.nextmail.auth.Role;
import com.nextmail.auth.User;
import com.nextmail.auth.UserRepository;
import com.nextmail.mail.Message;
import com.nextmail.mail.MessageRepository;
import com.nextmail.thread.Thread;
import com.nextmail.thread.ThreadRepository;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EmailIngestionTest {

    @RegisterExtension
    static GreenMailExtension greenMail = new GreenMailExtension(ServerSetupTest.SMTP)
            .withConfiguration(GreenMailConfiguration.aConfig().withUser("test@nextmail.local", "secret"))
            .withPerMethodLifecycle(false);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MimeNormalizationService normalizationService;

    @Autowired
    private IdempotentIngestionService ingestionService;

    @Autowired
    private SmtpOutboundDeliveryService smtpDeliveryService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private ThreadRepository threadRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User testUser;
    private String jwtToken;

    @BeforeEach
    void setUp() {
        messageRepository.deleteAll();
        threadRepository.deleteAll();
        userRepository.deleteAll();

        testUser = User.builder()
                .email("ingest.user@nextmail.local")
                .passwordHash("Argon2Hash")
                .fullName("Ingest User")
                .role(Role.ROLE_USER)
                .build();
        testUser = userRepository.save(testUser);

        jwtToken = jwtTokenProvider.generateAccessToken(testUser);
    }

    @Test
    @DisplayName("Parse raw RFC 5322 MIME email into NormalizedEmail")
    void shouldParseRawMimeEmail() throws Exception {
        String rawEml = """
                From: "Sarah Jenkins" <sarah.j@acme-systems.cloud>
                To: <ingest.user@nextmail.local>
                Subject: Production Database Maintenance Notice
                Message-ID: <db-maint-20261003@acme-systems.cloud>
                Date: Fri, 02 Oct 2026 14:00:00 +0000
                Content-Type: text/plain; charset=utf-8
                
                Hello Ingest User,
                
                The PostgreSQL primary cluster will undergo rolling kernel upgrades at 02:00 UTC.
                No downtime is expected.
                
                Best regards,
                Sarah
                """;

        NormalizedEmail normalized = normalizationService.parseRawEml(rawEml);

        assertNotNull(normalized);
        assertEquals("<db-maint-20261003@acme-systems.cloud>", normalized.getMessageIdHeader());
        assertEquals("Production Database Maintenance Notice", normalized.getSubject());
        assertEquals("sarah.j@acme-systems.cloud", normalized.getSenderEmail());
        assertEquals("Sarah Jenkins", normalized.getSenderName());
        assertTrue(normalized.getBodyText().contains("rolling kernel upgrades"));
        assertEquals(1, normalized.getRecipients().size());
        assertEquals("ingest.user@nextmail.local", normalized.getRecipients().get(0).getEmail());
    }

    @Test
    @DisplayName("Idempotent ingestion guarantees duplicate emails are rejected without duplicate rows")
    void shouldEnsureIdempotentIngestion() {
        NormalizedEmail email = NormalizedEmail.builder()
                .messageIdHeader("<idempotency-test-unique-id@vendor.com>")
                .subject("Vendor Invoice INV-9042")
                .senderEmail("billing@vendor.com")
                .senderName("Vendor Billing")
                .bodyText("Invoice INV-9042 is attached.")
                .sentAt(Instant.now())
                .receivedAt(Instant.now())
                .hasAttachments(false)
                .build();

        // First Ingestion
        Message firstResult = ingestionService.ingestEmail(testUser.getId(), email);
        assertNotNull(firstResult.getId());
        assertEquals(1, messageRepository.count());
        assertEquals(1, threadRepository.count());

        Thread thread = threadRepository.findById(firstResult.getThreadId()).orElseThrow();
        assertEquals(1, thread.getMessageCount());

        // Second Ingestion of EXACT same email (e.g. network retry or IMAP re-scan)
        Message secondResult = ingestionService.ingestEmail(testUser.getId(), email);
        assertNotNull(secondResult.getId());

        // Assert: Same ID returned, database message count remains 1, thread message count remains 1!
        assertEquals(firstResult.getId(), secondResult.getId());
        assertEquals(1, messageRepository.count(), "Message count must not increase on duplicate ingestion");
        assertEquals(1, threadRepository.count(), "Thread count must not increase on duplicate ingestion");

        Thread updatedThread = threadRepository.findById(firstResult.getThreadId()).orElseThrow();
        assertEquals(1, updatedThread.getMessageCount(), "Thread messageCount must remain 1");
    }

    @Test
    @DisplayName("HTTP POST /api/v1/mail/ingest/raw parses and persists email into user inbox")
    void shouldIngestEmailViaHttpEndpoint() throws Exception {
        String rawEml = """
                From: "Security Ops" <secops@nextmail.local>
                To: <ingest.user@nextmail.local>
                Subject: New Device Signed In
                Message-ID: <secops-alert-4481@nextmail.local>
                Date: Sat, 03 Oct 2026 09:00:00 +0000
                Content-Type: text/plain; charset=utf-8
                
                A new session was registered from Firefox on Linux.
                """;

        mockMvc.perform(post("/api/v1/mail/ingest/raw")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.TEXT_PLAIN)
                        .content(rawEml))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.subject").value("New Device Signed In"))
                .andExpect(jsonPath("$.data.senderEmail").value("secops@nextmail.local"))
                .andExpect(jsonPath("$.data.threadId").isNotEmpty());

        assertEquals(1, messageRepository.count());
    }

    @Test
    @DisplayName("Outbound SMTP delivery successfully sends RFC 5322 message to Mock SMTP server")
    void shouldDispatchMessageViaSmtp() {
        // Send email via SmtpOutboundDeliveryService to GreenMail mock SMTP
        boolean dispatched = smtpDeliveryService.dispatchSmtpMessage(
                "ingest.user@nextmail.local",
                "Ingest User",
                List.of("recipient@external.com"),
                null,
                null,
                "GreenMail SMTP Integration Test",
                "Hello GreenMail, testing SMTP transmission!",
                null,
                "<greenmail-test-msg-01@nextmail.local>",
                null,
                null
        );

        assertTrue(dispatched, "SMTP delivery should report success");

        // Verify GreenMail mock SMTP server captured the message
        MimeMessage[] receivedMessages = greenMail.getReceivedMessages();
        assertTrue(receivedMessages.length >= 1, "GreenMail should receive at least 1 message");
    }
}
