package com.nextmail.workflow;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nextmail.auth.JwtTokenProvider;
import com.nextmail.auth.Role;
import com.nextmail.auth.User;
import com.nextmail.auth.UserRepository;
import com.nextmail.thread.Thread;
import com.nextmail.thread.ThreadRepository;
import com.nextmail.workflow.dto.CreateFollowUpRequest;
import com.nextmail.workflow.dto.SnoozeFollowUpRequest;
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
import org.springframework.test.web.servlet.MvcResult;

import java.time.Instant;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FollowUpControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ThreadRepository threadRepository;

    @Autowired
    private FollowUpReminderRepository followUpRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User testUser;
    private String jwtToken;
    private Thread testThread;

    @BeforeEach
    void setUp() {
        followUpRepository.deleteAll();
        threadRepository.deleteAll();
        userRepository.deleteAll();

        testUser = User.builder()
                .email("workflow.user@nextmail.local")
                .passwordHash("DummyArgon2idHash")
                .fullName("Workflow Tester")
                .role(Role.ROLE_USER)
                .build();
        testUser = userRepository.save(testUser);
        jwtToken = jwtTokenProvider.generateAccessToken(testUser);

        testThread = Thread.builder()
                .userId(testUser.getId())
                .subject("Quarterly SRE Budget Approval")
                .subjectNormalized("quarterly sre budget approval")
                .firstMessageAt(Instant.now())
                .lastMessageAt(Instant.now())
                .messageCount(1)
                .build();
        testThread = threadRepository.save(testThread);
    }

    @Test
    @DisplayName("Create follow-up without authentication returns 401 Unauthorized")
    void createFollowUp_WithoutAuth_Returns401() throws Exception {
        CreateFollowUpRequest req = CreateFollowUpRequest.builder()
                .threadId(testThread.getId())
                .durationHours(24)
                .build();

        mockMvc.perform(post("/api/v1/workflow/followups")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Create follow-up with JWT succeeds with 201 Created and response DTO")
    void createFollowUp_WithAuth_Returns201() throws Exception {
        CreateFollowUpRequest req = CreateFollowUpRequest.builder()
                .threadId(testThread.getId())
                .durationHours(48)
                .condition(FollowUpCondition.NO_REPLY_RECEIVED)
                .note("Follow up on procurement sign-off")
                .build();

        mockMvc.perform(post("/api/v1/workflow/followups")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.threadSubject").value("Quarterly SRE Budget Approval"))
                .andExpect(jsonPath("$.data.condition").value("NO_REPLY_RECEIVED"))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.note").value("Follow up on procurement sign-off"));
    }

    @Test
    @DisplayName("Query user follow-ups returns active reminders list")
    void getUserFollowUps_ReturnsList() throws Exception {
        CreateFollowUpRequest req = CreateFollowUpRequest.builder()
                .threadId(testThread.getId())
                .durationHours(24)
                .condition(FollowUpCondition.NO_REPLY_RECEIVED)
                .build();

        mockMvc.perform(post("/api/v1/workflow/followups")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/workflow/followups")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].threadSubject").value("Quarterly SRE Budget Approval"));
    }

    @Test
    @DisplayName("Snooze and dismiss follow-up end-to-end")
    void snoozeAndDismissFollowUp_Success() throws Exception {
        CreateFollowUpRequest createReq = CreateFollowUpRequest.builder()
                .threadId(testThread.getId())
                .durationHours(24)
                .build();

        MvcResult createResult = mockMvc.perform(post("/api/v1/workflow/followups")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String responseBody = createResult.getResponse().getContentAsString();
        String followUpId = objectMapper.readTree(responseBody).path("data").path("id").asText();

        // Snooze by 72 hours
        SnoozeFollowUpRequest snoozeReq = SnoozeFollowUpRequest.builder()
                .additionalHours(72)
                .build();

        mockMvc.perform(post("/api/v1/workflow/followups/{id}/snooze", followUpId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(snoozeReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PENDING"));

        // Dismiss follow-up
        mockMvc.perform(delete("/api/v1/workflow/followups/{id}", followUpId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isOk());
    }
}
