package com.nextmail.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nextmail.auth.JwtTokenProvider;
import com.nextmail.auth.Role;
import com.nextmail.auth.User;
import com.nextmail.auth.UserRepository;
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

import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private User testUser;
    private String jwtToken;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        userRepository.deleteAll();

        testUser = User.builder()
                .email("notifications.tester@nextmail.local")
                .passwordHash("DummyArgon2idHash")
                .fullName("Notification Tester")
                .role(Role.ROLE_USER)
                .build();
        testUser = userRepository.save(testUser);
        jwtToken = jwtTokenProvider.generateAccessToken(testUser);
    }

    @Test
    @DisplayName("Query notifications without auth returns 401 Unauthorized")
    void getNotifications_WithoutAuth_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/notifications"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Query notifications with auth returns list of notifications")
    void getNotifications_WithAuth_ReturnsList() throws Exception {
        Notification notification = Notification.builder()
                .userId(testUser.getId())
                .title("New Message from Sarah")
                .message("Review the database migration runbook")
                .type(NotificationType.NEW_EMAIL)
                .referenceId("thread-001")
                .isRead(false)
                .build();
        notificationRepository.save(notification);

        mockMvc.perform(get("/api/v1/notifications")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].title").value("New Message from Sarah"))
                .andExpect(jsonPath("$.data[0].type").value("NEW_EMAIL"));
    }

    @Test
    @DisplayName("Query unread count returns number of unread notifications")
    void getUnreadCount_ReturnsCount() throws Exception {
        Notification n1 = Notification.builder().userId(testUser.getId()).title("N1").message("M1").type(NotificationType.NEW_EMAIL).isRead(false).build();
        Notification n2 = Notification.builder().userId(testUser.getId()).title("N2").message("M2").type(NotificationType.FOLLOW_UP_DUE).isRead(false).build();
        Notification n3 = Notification.builder().userId(testUser.getId()).title("N3").message("M3").type(NotificationType.AI_SUMMARY_READY).isRead(true).build();
        notificationRepository.saveAll(java.util.List.of(n1, n2, n3));

        mockMvc.perform(get("/api/v1/notifications/unread-count")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(2));
    }

    @Test
    @DisplayName("Mark notification as read succeeds")
    void markAsRead_Succeeds() throws Exception {
        Notification n = Notification.builder()
                .userId(testUser.getId())
                .title("Unread alert")
                .message("Message")
                .type(NotificationType.SECURITY_ALERT)
                .isRead(false)
                .build();
        n = notificationRepository.save(n);

        mockMvc.perform(patch("/api/v1/notifications/{id}/read", n.getId())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        Notification updated = notificationRepository.findById(n.getId()).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(updated.isRead()).isTrue();
    }

    @Test
    @DisplayName("Mark all as read succeeds")
    void markAllAsRead_Succeeds() throws Exception {
        Notification n1 = Notification.builder().userId(testUser.getId()).title("N1").message("M").type(NotificationType.NEW_EMAIL).isRead(false).build();
        Notification n2 = Notification.builder().userId(testUser.getId()).title("N2").message("M").type(NotificationType.NEW_EMAIL).isRead(false).build();
        notificationRepository.saveAll(java.util.List.of(n1, n2));

        mockMvc.perform(post("/api/v1/notifications/mark-all-read")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken))
                .andExpect(status().isOk());

        long unreadCount = notificationRepository.countByUserIdAndIsReadFalse(testUser.getId());
        org.assertj.core.api.Assertions.assertThat(unreadCount).isEqualTo(0L);
    }
}
