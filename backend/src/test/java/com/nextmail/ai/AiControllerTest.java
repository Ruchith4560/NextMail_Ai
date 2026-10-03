package com.nextmail.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nextmail.ai.dto.AiReplyRequest;
import com.nextmail.ai.dto.ReplyTone;
import com.nextmail.auth.JwtTokenProvider;
import com.nextmail.auth.Role;
import com.nextmail.auth.User;
import com.nextmail.auth.UserRepository;
import com.nextmail.mail.MailFolder;
import com.nextmail.mail.Message;
import com.nextmail.mail.MessageRepository;
import com.nextmail.thread.Thread;
import com.nextmail.thread.ThreadRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ThreadRepository threadRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private ThreadSummaryRepository threadSummaryRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User testUser;
    private String jwtToken;
    private Thread testThread;

    @BeforeEach
    void setUp() {
        threadSummaryRepository.deleteAll();
        messageRepository.deleteAll();
        threadRepository.deleteAll();
        userRepository.deleteAll();

        testUser = User.builder()
                .email("ai.pilot@nextmail.local")
                .passwordHash("DummyArgon2idHash")
                .fullName("AI Pilot")
                .role(Role.ROLE_USER)
                .build();
        testUser = userRepository.save(testUser);
        jwtToken = jwtTokenProvider.generateAccessToken(testUser);

        testThread = Thread.builder()
                .userId(testUser.getId())
                .subject("Zero-Downtime PostgreSQL Migration Plan")
                .subjectNormalized("zero downtime postgresql migration plan")
                .firstMessageAt(Instant.now())
                .lastMessageAt(Instant.now())
                .messageCount(1)
                .build();
        testThread = threadRepository.save(testThread);

        Message msg = Message.builder()
                .threadId(testThread.getId())
                .userId(testUser.getId())
                .messageIdHeader("<migration-1@nextmail.local>")
                .senderEmail("architect@nextmail.local")
                .senderName("Chief Architect")
                .subject("Zero-Downtime PostgreSQL Migration Plan")
                .bodyText("Team,\n\nPlease review the attached zero-downtime database migration runbook. Are all indexes validated?")
                .sentAt(Instant.now())
                .receivedAt(Instant.now())
                .folder(MailFolder.INBOX)
                .hasAttachments(true)
                .build();
        messageRepository.save(msg);
    }

    @Test
    @DisplayName("GET /api/v1/ai/threads/{threadId}/summary returns structured conversation intelligence")
    void shouldReturnThreadSummary() throws Exception {
        mockMvc.perform(get("/api/v1/ai/threads/" + testThread.getId() + "/summary")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.threadId").value(testThread.getId().toString()))
                .andExpect(jsonPath("$.data.overview").isNotEmpty())
                .andExpect(jsonPath("$.data.priorityTier").isNotEmpty())
                .andExpect(jsonPath("$.data.actionItems", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.data.keyDecisions", hasSize(greaterThanOrEqualTo(1))));
    }

    @Test
    @DisplayName("POST /api/v1/ai/threads/{threadId}/reply generates tone-customized draft reply")
    void shouldGenerateDraftReply() throws Exception {
        AiReplyRequest request = AiReplyRequest.builder()
                .tone(ReplyTone.TECHNICAL)
                .instructions("All B-tree and GiST indexes verified on staging")
                .build();

        mockMvc.perform(post("/api/v1/ai/threads/" + testThread.getId() + "/reply")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.tone").value("TECHNICAL"))
                .andExpect(jsonPath("$.data.suggestedReplyText", containsString("B-tree and GiST indexes verified")));
    }

    @Test
    @DisplayName("Unauthenticated request to AI endpoints is rejected with 401")
    void shouldRejectUnauthenticatedAiRequest() throws Exception {
        mockMvc.perform(get("/api/v1/ai/threads/" + testThread.getId() + "/summary"))
                .andExpect(status().isUnauthorized());
    }
}
