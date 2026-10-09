package com.nextmail.workflow;

import com.nextmail.mail.MailFolder;
import com.nextmail.mail.Message;
import com.nextmail.mail.MessageRepository;
import com.nextmail.thread.PriorityTier;
import com.nextmail.thread.Thread;
import com.nextmail.thread.ThreadRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Background scheduler daemon that evaluates due follow-up reminders,
 * checks for intermediate inbound replies, auto-resolves or triggers escalation alerts.
 */
@Service
@Slf4j
public class FollowUpSchedulerService {

    private final FollowUpReminderRepository followUpRepository;
    private final ThreadRepository threadRepository;
    private final MessageRepository messageRepository;
    private final org.springframework.context.ApplicationEventPublisher eventPublisher;
    private final java.util.Optional<com.nextmail.common.metrics.NextMailMetrics> metrics;

    public FollowUpSchedulerService(
            FollowUpReminderRepository followUpRepository,
            ThreadRepository threadRepository,
            MessageRepository messageRepository,
            org.springframework.context.ApplicationEventPublisher eventPublisher) {
        this(followUpRepository, threadRepository, messageRepository, eventPublisher, java.util.Optional.empty());
    }

    @org.springframework.beans.factory.annotation.Autowired
    public FollowUpSchedulerService(
            FollowUpReminderRepository followUpRepository,
            ThreadRepository threadRepository,
            MessageRepository messageRepository,
            org.springframework.context.ApplicationEventPublisher eventPublisher,
            java.util.Optional<com.nextmail.common.metrics.NextMailMetrics> metrics) {
        this.followUpRepository = followUpRepository;
        this.threadRepository = threadRepository;
        this.messageRepository = messageRepository;
        this.eventPublisher = eventPublisher;
        this.metrics = metrics != null ? metrics : java.util.Optional.empty();
    }


    @Scheduled(fixedDelay = 30000)
    @Transactional
    public void evaluateDueReminders() {
        Instant now = Instant.now();
        List<FollowUpReminder> dueReminders = followUpRepository.findByStatusAndDueAtBefore(FollowUpStatus.PENDING, now);

        if (dueReminders.isEmpty()) {
            return;
        }

        log.info("Evaluating {} due follow-up reminder(s)", dueReminders.size());

        for (FollowUpReminder reminder : dueReminders) {
            try {
                processReminder(reminder, now);
            } catch (Exception ex) {
                log.error("Failed to process follow-up reminder {}: {}", reminder.getId(), ex.getMessage(), ex);
            }
        }
    }

    public void processReminder(FollowUpReminder reminder, Instant evaluationTime) {
        if (reminder.getCondition() == FollowUpCondition.NO_REPLY_RECEIVED) {
            List<Message> messages = messageRepository.findByThreadIdAndUserIdOrderBySentAtAsc(
                    reminder.getThreadId(), reminder.getUserId());

            boolean replyReceived = messages.stream()
                    .filter(m -> m.getFolder() != MailFolder.SENT && m.getFolder() != MailFolder.DRAFTS)
                    .anyMatch(m -> m.getReceivedAt() != null && m.getReceivedAt().isAfter(reminder.getOriginalLastMessageAt()));

            if (replyReceived) {
                reminder.setStatus(FollowUpStatus.AUTO_RESOLVED);
                reminder.setResolvedAt(evaluationTime);
                log.info("Follow-up reminder {} AUTO_RESOLVED: inbound reply received in thread {}",
                        reminder.getId(), reminder.getThreadId());
            } else {
                triggerReminder(reminder, evaluationTime, "Action Required: Follow-up deadline reached with no response received.");
            }
        } else {
            String reason = reminder.getNote() != null && !reminder.getNote().isBlank()
                    ? "Scheduled Reminder: " + reminder.getNote()
                    : "Scheduled reminder deadline reached.";
            triggerReminder(reminder, evaluationTime, reason);
        }

        followUpRepository.save(reminder);
    }

    private void triggerReminder(FollowUpReminder reminder, Instant triggerTime, String priorityReason) {
        reminder.setStatus(FollowUpStatus.TRIGGERED);
        reminder.setTriggeredAt(triggerTime);

        threadRepository.findById(reminder.getThreadId()).ifPresent(thread -> {
            if (thread.getPriorityTier() != PriorityTier.URGENT) {
                thread.setPriorityTier(PriorityTier.IMPORTANT);
            }
            thread.setPriorityReason(priorityReason);
            threadRepository.save(thread);
            log.info("Triggered follow-up reminder {} and escalated thread {} to {}",
                    reminder.getId(), thread.getId(), thread.getPriorityTier());

            metrics.ifPresent(com.nextmail.common.metrics.NextMailMetrics::recordFollowUpTriggered);

            eventPublisher.publishEvent(new com.nextmail.workflow.event.FollowUpTriggeredEvent(
                    reminder.getId(),
                    reminder.getUserId(),
                    reminder.getThreadId(),
                    thread.getSubject(),
                    reminder.getNote()
            ));
        });
    }
}

