package com.nextmail.notification;

import com.nextmail.mail.event.EmailIngestedEvent;
import com.nextmail.workflow.event.FollowUpTriggeredEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationEventListener {

    private final NotificationService notificationService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onEmailIngested(EmailIngestedEvent event) {
        log.debug("Notification listener handling EmailIngestedEvent for user {}", event.getUserId());
        try {
            String title = "New message from " + (event.getSenderEmail() != null ? event.getSenderEmail() : "Unknown");
            String message = event.getSubject() != null && !event.getSubject().isBlank()
                    ? event.getSubject()
                    : "(No subject)";

            notificationService.sendNotification(
                    event.getUserId(),
                    NotificationType.NEW_EMAIL,
                    title,
                    message,
                    event.getThreadId().toString()
            );

            // Broadcast real-time refresh signal so the recipient's UI updates immediately
            notificationService.broadcastInboxRefresh(event.getUserId(), event.getThreadId());
        } catch (Exception ex) {
            log.warn("Failed to dispatch EmailIngested notification: {}", ex.getMessage());
        }
    }

    @Async
    @EventListener
    public void onFollowUpTriggered(FollowUpTriggeredEvent event) {
        log.info("Notification listener handling FollowUpTriggeredEvent for user {}", event.getUserId());
        try {
            String title = "Follow-Up Due: " + (event.getThreadSubject() != null ? event.getThreadSubject() : "Untitled Thread");
            String message = event.getNote() != null && !event.getNote().isBlank()
                    ? event.getNote()
                    : "Action required: Follow-up deadline reached with no response received.";

            notificationService.sendNotification(
                    event.getUserId(),
                    NotificationType.FOLLOW_UP_DUE,
                    title,
                    message,
                    event.getThreadId().toString()
            );

            notificationService.broadcastInboxRefresh(event.getUserId(), event.getThreadId());
        } catch (Exception ex) {
            log.warn("Failed to dispatch FollowUpTriggered notification: {}", ex.getMessage());
        }
    }
}
