package com.nextmail.notification;

import com.nextmail.notification.dto.NotificationDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private NotificationService notificationService;

    private final UUID testUserId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(notificationRepository, messagingTemplate);
    }

    @Test
    @DisplayName("Successfully creates notification in DB and broadcasts over WebSocket")
    void sendNotification_SavesAndDispatchesWebSocket() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(inv -> {
            Notification n = inv.getArgument(0);
            n.setId(UUID.randomUUID());
            return n;
        });

        NotificationDTO result = notificationService.sendNotification(
                testUserId,
                NotificationType.NEW_EMAIL,
                "New Email from CTO",
                "Please review the Q4 architecture roadmap",
                "thread-123"
        );

        assertThat(result).isNotNull();
        assertThat(result.getTitle()).isEqualTo("New Email from CTO");
        assertThat(result.getType()).isEqualTo(NotificationType.NEW_EMAIL);
        assertThat(result.isRead()).isFalse();

        verify(notificationRepository).save(any(Notification.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/user/" + testUserId + "/notifications"), eq(result));
        verify(messagingTemplate).convertAndSendToUser(eq(testUserId.toString()), eq("/queue/notifications"), eq(result));
    }

    @Test
    @DisplayName("Broadcasts real-time inbox refresh signal to user topic")
    void broadcastInboxRefresh_DispatchesToInboxTopic() {
        UUID threadId = UUID.randomUUID();
        notificationService.broadcastInboxRefresh(testUserId, threadId);

        ArgumentCaptor<Map<String, Object>> payloadCaptor = ArgumentCaptor.forClass(Map.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/user/" + testUserId + "/inbox"), payloadCaptor.capture());

        Map<String, Object> payload = payloadCaptor.getValue();
        assertThat(payload.get("action")).isEqualTo("REFRESH_INBOX");
        assertThat(payload.get("threadId")).isEqualTo(threadId.toString());
    }

    @Test
    @DisplayName("Returns unread notifications when unreadOnly is true")
    void getUserNotifications_UnreadOnly_FiltersCorrectly() {
        Notification unread = Notification.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .title("Unread Alert")
                .message("Message")
                .type(NotificationType.SECURITY_ALERT)
                .isRead(false)
                .build();

        when(notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(testUserId))
                .thenReturn(List.of(unread));

        List<NotificationDTO> results = notificationService.getUserNotifications(testUserId, true);

        assertThat(results).hasSize(1);
        assertThat(results.get(0).getTitle()).isEqualTo("Unread Alert");
        verify(notificationRepository).findByUserIdAndIsReadFalseOrderByCreatedAtDesc(testUserId);
        verify(notificationRepository, never()).findByUserIdOrderByCreatedAtDesc(any());
    }

    @Test
    @DisplayName("Marks specific notification as read")
    void markAsRead_Success() {
        UUID notifId = UUID.randomUUID();
        Notification notif = Notification.builder()
                .id(notifId)
                .userId(testUserId)
                .isRead(false)
                .build();

        when(notificationRepository.findByIdAndUserId(notifId, testUserId)).thenReturn(Optional.of(notif));

        notificationService.markAsRead(testUserId, notifId);

        assertThat(notif.isRead()).isTrue();
        verify(notificationRepository).save(notif);
    }

    @Test
    @DisplayName("Marks all user notifications as read")
    void markAllAsRead_Success() {
        Notification n1 = Notification.builder().id(UUID.randomUUID()).userId(testUserId).isRead(false).build();
        Notification n2 = Notification.builder().id(UUID.randomUUID()).userId(testUserId).isRead(false).build();

        when(notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(testUserId))
                .thenReturn(List.of(n1, n2));

        notificationService.markAllAsRead(testUserId);

        assertThat(n1.isRead()).isTrue();
        assertThat(n2.isRead()).isTrue();
        verify(notificationRepository).saveAll(List.of(n1, n2));
    }
}
