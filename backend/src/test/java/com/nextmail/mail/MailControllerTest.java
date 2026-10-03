package com.nextmail.mail;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nextmail.auth.JwtTokenProvider;
import com.nextmail.auth.Role;
import com.nextmail.auth.User;
import com.nextmail.auth.UserRepository;
import com.nextmail.mail.dto.SaveDraftRequest;
import com.nextmail.mail.dto.SendMessageRequest;
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
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MailControllerTest {

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
    private DraftRepository draftRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User testUser;
    private String jwtToken;

    @BeforeEach
    void setUp() {
        messageRepository.deleteAll();
        threadRepository.deleteAll();
        draftRepository.deleteAll();
        userRepository.deleteAll();

        testUser = User.builder()
                .email("test.pilot@nextmail.local")
                .passwordHash("DummyArgon2idHash")
                .fullName("Test Pilot")
                .role(Role.ROLE_USER)
                .build();
        testUser = userRepository.save(testUser);

        jwtToken = jwtTokenProvider.generateAccessToken(testUser);
    }

    @Test
    @DisplayName("Send message creates new message and thread")
    void shouldSendMessageSuccessfully() throws Exception {
        SendMessageRequest request = SendMessageRequest.builder()
                .to(List.of("sarah@nextmail.local"))
                .subject("Sprint 42 Release Retrospective")
                .bodyText("Team,\n\nHere are the velocity charts for Sprint 42.\n\nBest,\nTest Pilot")
                .isControlled(true)
                .expiryHours(24)
                .build();

        mockMvc.perform(post("/api/v1/mail/send")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.subject").value("Sprint 42 Release Retrospective"))
                .andExpect(jsonPath("$.data.isControlled").value(true))
                .andExpect(jsonPath("$.data.threadId").isNotEmpty());
    }

    @Test
    @DisplayName("Thread actions: Star, Read, Archive, and Trash")
    void shouldPerformThreadLifecycleActions() throws Exception {
        // 1. Send message to create thread
        SendMessageRequest sendReq = SendMessageRequest.builder()
                .to(List.of("sarah@nextmail.local"))
                .subject("Important Quarterly Metrics")
                .bodyText("Check out the Q3 numbers.")
                .build();

        MvcResult sendResult = mockMvc.perform(post("/api/v1/mail/send")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sendReq)))
                .andExpect(status().isCreated())
                .andReturn();

        String threadId = objectMapper.readTree(sendResult.getResponse().getContentAsString())
                .get("data").get("threadId").asText();

        // 2. Star thread
        mockMvc.perform(patch("/api/v1/mail/threads/" + threadId + "/star")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // 3. Mark unread
        mockMvc.perform(patch("/api/v1/mail/threads/" + threadId + "/read?isRead=false")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk());

        // 4. Archive thread
        mockMvc.perform(patch("/api/v1/mail/threads/" + threadId + "/archive")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk());

        // 5. Trash thread
        mockMvc.perform(delete("/api/v1/mail/threads/" + threadId)
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Draft CRUD lifecycle")
    void shouldSaveAndRetrieveDrafts() throws Exception {
        SaveDraftRequest draftReq = SaveDraftRequest.builder()
                .toRecipients("partner@firm.com")
                .subject("Draft Term Sheet Review")
                .bodyText("Here is an autosaved draft...")
                .isControlled(true)
                .build();

        MvcResult saveResult = mockMvc.perform(post("/api/v1/mail/drafts")
                        .header("Authorization", "Bearer " + jwtToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(draftReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.subject").value("Draft Term Sheet Review"))
                .andReturn();

        String draftId = objectMapper.readTree(saveResult.getResponse().getContentAsString())
                .get("data").get("id").asText();

        // Retrieve drafts list
        mockMvc.perform(get("/api/v1/mail/drafts")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content", hasSize(1)));

        // Delete draft
        mockMvc.perform(delete("/api/v1/mail/drafts/" + draftId)
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk());
    }
}
