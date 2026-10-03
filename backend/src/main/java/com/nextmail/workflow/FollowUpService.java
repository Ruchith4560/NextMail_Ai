package com.nextmail.workflow;

import com.nextmail.mail.Message;
import com.nextmail.mail.MessageRepository;
import com.nextmail.thread.Thread;
import com.nextmail.thread.ThreadRepository;
import com.nextmail.workflow.dto.CreateFollowUpRequest;
import com.nextmail.workflow.dto.FollowUpResponseDTO;
import com.nextmail.workflow.dto.SnoozeFollowUpRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FollowUpService {

    private final FollowUpReminderRepository followUpRepository;
    private final ThreadRepository threadRepository;
    private final MessageRepository messageRepository;

    @Transactional
    public FollowUpResponseDTO createFollowUp(UUID userId, CreateFollowUpRequest request) {
        Thread thread = threadRepository.findByIdAndUserId(request.getThreadId(), userId)
                .orElseThrow(() -> new IllegalArgumentException("Thread not found with ID: " + request.getThreadId()));

        Instant dueAt;
        if (request.getDueAt() != null) {
            dueAt = request.getDueAt();
        } else {
            int hours = request.getDurationHours() != null ? request.getDurationHours() : 24;
            dueAt = Instant.now().plus(hours, ChronoUnit.HOURS);
        }

        if (dueAt.isBefore(Instant.now())) {
            throw new IllegalArgumentException("Follow-up due date must be in the future");
        }

        // Cancel any existing pending reminders for this thread
        Optional<FollowUpReminder> existingPending = followUpRepository.findByThreadIdAndStatus(thread.getId(), FollowUpStatus.PENDING);
        existingPending.ifPresent(prev -> {
            prev.setStatus(FollowUpStatus.DISMISSED);
            followUpRepository.save(prev);
            log.info("Superseded previous follow-up {} for thread {}", prev.getId(), thread.getId());
        });

        Instant baselineTimestamp = thread.getLastMessageAt() != null ? thread.getLastMessageAt() : Instant.now();

        FollowUpReminder reminder = FollowUpReminder.builder()
                .userId(userId)
                .threadId(thread.getId())
                .messageId(request.getMessageId())
                .dueAt(dueAt)
                .condition(request.getCondition() != null ? request.getCondition() : FollowUpCondition.NO_REPLY_RECEIVED)
                .status(FollowUpStatus.PENDING)
                .note(request.getNote())
                .originalLastMessageAt(baselineTimestamp)
                .build();

        reminder = followUpRepository.save(reminder);
        log.info("Created follow-up reminder {} for user {} on thread {} due at {}",
                reminder.getId(), userId, thread.getId(), dueAt);

        return mapToDTO(reminder, thread.getSubject());
    }

    @Transactional(readOnly = true)
    public List<FollowUpResponseDTO> getUserFollowUps(UUID userId, FollowUpStatus status) {
        List<FollowUpReminder> reminders = (status != null)
                ? followUpRepository.findByUserIdAndStatusOrderByDueAtAsc(userId, status)
                : followUpRepository.findByUserIdOrderByDueAtAsc(userId);

        return reminders.stream()
                .map(r -> {
                    String subject = threadRepository.findById(r.getThreadId())
                            .map(Thread::getSubject)
                            .orElse("Untitled Thread");
                    return mapToDTO(r, subject);
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<FollowUpResponseDTO> getFollowUpForThread(UUID userId, UUID threadId) {
        return followUpRepository.findByThreadIdAndStatus(threadId, FollowUpStatus.PENDING)
                .filter(r -> r.getUserId().equals(userId))
                .map(r -> {
                    String subject = threadRepository.findById(threadId).map(Thread::getSubject).orElse("Untitled");
                    return mapToDTO(r, subject);
                });
    }

    @Transactional
    public FollowUpResponseDTO snoozeFollowUp(UUID userId, UUID followUpId, SnoozeFollowUpRequest request) {
        FollowUpReminder reminder = followUpRepository.findByIdAndUserId(followUpId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Follow-up reminder not found"));

        Instant newDue;
        if (request.getNewDueAt() != null) {
            newDue = request.getNewDueAt();
        } else if (request.getAdditionalHours() != null) {
            newDue = Instant.now().plus(request.getAdditionalHours(), ChronoUnit.HOURS);
        } else {
            newDue = Instant.now().plus(24, ChronoUnit.HOURS);
        }

        if (newDue.isBefore(Instant.now())) {
            throw new IllegalArgumentException("Snooze duration must be in the future");
        }

        reminder.setDueAt(newDue);
        reminder.setStatus(FollowUpStatus.PENDING);
        reminder.setTriggeredAt(null);
        reminder = followUpRepository.save(reminder);

        String subject = threadRepository.findById(reminder.getThreadId()).map(Thread::getSubject).orElse("Untitled");
        log.info("Snoozed follow-up {} to {}", followUpId, newDue);
        return mapToDTO(reminder, subject);
    }

    @Transactional
    public void dismissFollowUp(UUID userId, UUID followUpId) {
        FollowUpReminder reminder = followUpRepository.findByIdAndUserId(followUpId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Follow-up reminder not found"));

        reminder.setStatus(FollowUpStatus.DISMISSED);
        reminder.setResolvedAt(Instant.now());
        followUpRepository.save(reminder);
        log.info("Dismissed follow-up {}", followUpId);
    }

    public FollowUpResponseDTO mapToDTO(FollowUpReminder reminder, String threadSubject) {
        return FollowUpResponseDTO.builder()
                .id(reminder.getId())
                .userId(reminder.getUserId())
                .threadId(reminder.getThreadId())
                .threadSubject(threadSubject)
                .messageId(reminder.getMessageId())
                .dueAt(reminder.getDueAt())
                .condition(reminder.getCondition())
                .status(reminder.getStatus())
                .note(reminder.getNote())
                .originalLastMessageAt(reminder.getOriginalLastMessageAt())
                .triggeredAt(reminder.getTriggeredAt())
                .resolvedAt(reminder.getResolvedAt())
                .createdAt(reminder.getCreatedAt())
                .build();
    }
}
