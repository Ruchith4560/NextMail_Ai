package com.nextmail.notification;

import com.nextmail.notification.dto.NotificationDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public NotificationDTO sendNotification(UUID userId, NotificationType type, String title, String message, String referenceId) {
        Notification notification = Notification.builder()
                .userId(userId)
                .type(type)
                .title(title)
                .message(message)
                .referenceId(referenceId)
                .isRead(false)
                .build();

        notification = notificationRepository.save(notification);
        NotificationDTO dto = mapToDTO(notification);

        // Realtime dispatch over STOMP WebSocket
        try {
            messagingTemplate.convertAndSend("/topic/user/" + userId + "/notifications", dto);
            messagingTemplate.convertAndSendToUser(userId.toString(), "/queue/notifications", dto);
            log.info("Dispatched realtime notification {} ('{}') to user {}", notification.getId(), type, userId);
        } catch (Exception ex) {
            log.warn("Failed to push realtime WebSocket notification to user {}: {}", userId, ex.getMessage());
        }

        return dto;
    }

    /**
     * Sends a real-time signal instructing the frontend inbox to refresh threads.
     */
    public void broadcastInboxRefresh(UUID userId, UUID threadId) {
        try {
            Map<String, Object> payload = Map.of(
                    "action", "REFRESH_INBOX",
                    "threadId", threadId != null ? threadId.toString() : "",
                    "timestamp", System.currentTimeMillis()
            );
            messagingTemplate.convertAndSend("/topic/user/" + userId + "/inbox", payload);
            log.debug("Dispatched inbox refresh signal to user {} for thread {}", userId, threadId);
        } catch (Exception ex) {
            log.warn("Failed to send inbox refresh signal to user {}: {}", userId, ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<NotificationDTO> getUserNotifications(UUID userId, boolean unreadOnly) {
        List<Notification> notifications = unreadOnly
                ? notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId)
                : notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);

        return notifications.stream().map(this::mapToDTO).toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(UUID userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Transactional
    public void markAsRead(UUID userId, UUID notificationId) {
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found"));
        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(UUID userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        for (Notification n : unread) {
            n.setRead(true);
        }
        notificationRepository.saveAll(unread);
        log.info("Marked {} notification(s) as read for user {}", unread.size(), userId);
    }

    private NotificationDTO mapToDTO(Notification n) {
        return NotificationDTO.builder()
                .id(n.getId())
                .userId(n.getUserId())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType())
                .referenceId(n.getReferenceId())
                .isRead(n.isRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
