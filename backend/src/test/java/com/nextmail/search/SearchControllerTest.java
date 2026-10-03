package com.nextmail.search;

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
class SearchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ThreadRepository threadRepository;

    @Autowired
    private MessageRepository messageRepository;

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
                .email("search.tester@nextmail.local")
                .passwordHash("TestArgonHash")
                .fullName("Search Tester")
                .role(Role.ROLE_USER)
                .build();
        testUser = userRepository.save(testUser);
        jwtToken = jwtTokenProvider.generateAccessToken(testUser);

        Thread thread1 = Thread.builder()
                .userId(testUser.getId())
                .subject("Vendor AWS Cloud Invoice")
                .subjectNormalized("vendor aws cloud invoice")
                .firstMessageAt(Instant.now())
                .lastMessageAt(Instant.now())
                .messageCount(1)
                .build();
        thread1 = threadRepository.save(thread1);

        Message msg1 = Message.builder()
                .threadId(thread1.getId())
                .userId(testUser.getId())
                .messageIdHeader("<msg-inv-1@aws.com>")
                .senderEmail("billing@aws.com")
                .senderName("AWS Billing")
                .subject("Vendor AWS Cloud Invoice")
                .bodyText("Please review the quarterly invoice attached for EC2 cluster compute.")
                .sentAt(Instant.now())
                .receivedAt(Instant.now())
                .folder(MailFolder.INBOX)
                .hasAttachments(true)
                .isRead(false)
                .build();
        messageRepository.save(msg1);

        Thread thread2 = Thread.builder()
                .userId(testUser.getId())
                .subject("Weekly Engineering Sprint Sync")
                .subjectNormalized("weekly engineering sprint sync")
                .firstMessageAt(Instant.now())
                .lastMessageAt(Instant.now())
                .messageCount(1)
                .build();
        thread2 = threadRepository.save(thread2);

        Message msg2 = Message.builder()
                .threadId(thread2.getId())
                .userId(testUser.getId())
                .messageIdHeader("<msg-standup-2@nextmail.local>")
                .senderEmail("lead@nextmail.local")
                .senderName("Tech Lead")
                .subject("Weekly Engineering Sprint Sync")
                .bodyText("Sprint 42 completed on schedule. Great job team.")
                .sentAt(Instant.now())
                .receivedAt(Instant.now())
                .folder(MailFolder.SENT)
                .hasAttachments(false)
                .isRead(true)
                .build();
        messageRepository.save(msg2);
    }

    @Test
    @DisplayName("Search with query string returns matched results with highlighted snippet")
    void shouldSearchWithQueryMatching() throws Exception {
        mockMvc.perform(get("/api/v1/search")
                        .header("Authorization", "Bearer " + jwtToken)
                        .param("q", "Invoice"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].subject").value("Vendor AWS Cloud Invoice"))
                .andExpect(jsonPath("$.data.content[0].senderEmail").value("billing@aws.com"))
                .andExpect(jsonPath("$.data.content[0].highlightedSnippet", containsString("<mark class=")))
                .andExpect(jsonPath("$.data.executedByEngine").isNotEmpty());
    }

    @Test
    @DisplayName("Search with folder filter restricts results")
    void shouldFilterByFolder() throws Exception {
        mockMvc.perform(get("/api/v1/search")
                        .header("Authorization", "Bearer " + jwtToken)
                        .param("folder", "SENT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content", hasSize(1)))
                .andExpect(jsonPath("$.data.content[0].subject").value("Weekly Engineering Sprint Sync"));
    }

    @Test
    @DisplayName("Reindex endpoint re-indexes all user messages")
    void shouldTriggerReindex() throws Exception {
        mockMvc.perform(post("/api/v1/search/reindex")
                        .header("Authorization", "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("SUCCESS"));
    }

    @Test
    @DisplayName("Search without token is rejected with 401 Unauthorized")
    void shouldRejectUnauthenticatedSearch() throws Exception {
        mockMvc.perform(get("/api/v1/search")
                        .param("q", "test"))
                .andExpect(status().isUnauthorized());
    }
}
