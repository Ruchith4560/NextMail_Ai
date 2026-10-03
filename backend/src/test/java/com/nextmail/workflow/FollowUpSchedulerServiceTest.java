package com.nextmail.workflow;

import com.nextmail.mail.MailFolder;
import com.nextmail.mail.Message;
import com.nextmail.mail.MessageRepository;
import com.nextmail.thread.PriorityTier;
import com.nextmail.thread.Thread;
import com.nextmail.thread.ThreadRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FollowUpSchedulerServiceTest {

    @Mock
    private FollowUpReminderRepository followUpRepository;

    @Mock
    private ThreadRepository threadRepository;

    @Mock
    private MessageRepository messageRepository;

    private FollowUpSchedulerService schedulerService;

    private final UUID testUserId = UUID.randomUUID();
    private final UUID testThreadId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        schedulerService = new FollowUpSchedulerService(followUpRepository, threadRepository, messageRepository);
    }

    @Test
    @DisplayName("Auto-resolves reminder if inbound reply arrived in thread before evaluation")
    void evaluateDueReminders_InboundReplyArrived_AutoResolves() {
        Instant baseline = Instant.now().minus(2, ChronoUnit.HOURS);
        Instant replyTime = Instant.now().minus(30, ChronoUnit.MINUTES);

        FollowUpReminder reminder = FollowUpReminder.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .threadId(testThreadId)
                .dueAt(Instant.now().minus(5, ChronoUnit.MINUTES))
                .condition(FollowUpCondition.NO_REPLY_RECEIVED)
                .status(FollowUpStatus.PENDING)
                .originalLastMessageAt(baseline)
                .build();

        Message replyMessage = Message.builder()
                .id(UUID.randomUUID())
                .threadId(testThreadId)
                .userId(testUserId)
                .folder(MailFolder.INBOX)
                .receivedAt(replyTime)
                .build();

        when(followUpRepository.findByStatusAndDueAtBefore(eq(FollowUpStatus.PENDING), any()))
                .thenReturn(List.of(reminder));
        when(messageRepository.findByThreadIdAndUserIdOrderBySentAtAsc(testThreadId, testUserId))
                .thenReturn(List.of(replyMessage));

        schedulerService.evaluateDueReminders();

        assertThat(reminder.getStatus()).isEqualTo(FollowUpStatus.AUTO_RESOLVED);
        assertThat(reminder.getResolvedAt()).isNotNull();
        verify(followUpRepository).save(reminder);
        verifyNoInteractions(threadRepository);
    }

    @Test
    @DisplayName("Triggers reminder and escalates thread priority if no reply received")
    void evaluateDueReminders_NoReply_TriggersAndEscalatesThread() {
        Instant baseline = Instant.now().minus(2, ChronoUnit.HOURS);

        FollowUpReminder reminder = FollowUpReminder.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .threadId(testThreadId)
                .dueAt(Instant.now().minus(5, ChronoUnit.MINUTES))
                .condition(FollowUpCondition.NO_REPLY_RECEIVED)
                .status(FollowUpStatus.PENDING)
                .originalLastMessageAt(baseline)
                .build();

        Thread thread = Thread.builder()
                .id(testThreadId)
                .userId(testUserId)
                .priorityTier(PriorityTier.NORMAL)
                .build();

        when(followUpRepository.findByStatusAndDueAtBefore(eq(FollowUpStatus.PENDING), any()))
                .thenReturn(List.of(reminder));
        when(messageRepository.findByThreadIdAndUserIdOrderBySentAtAsc(testThreadId, testUserId))
                .thenReturn(List.of()); // No replies
        when(threadRepository.findById(testThreadId)).thenReturn(Optional.of(thread));

        schedulerService.evaluateDueReminders();

        assertThat(reminder.getStatus()).isEqualTo(FollowUpStatus.TRIGGERED);
        assertThat(reminder.getTriggeredAt()).isNotNull();
        assertThat(thread.getPriorityTier()).isEqualTo(PriorityTier.IMPORTANT);
        assertThat(thread.getPriorityReason()).contains("Action Required");

        verify(threadRepository).save(thread);
        verify(followUpRepository).save(reminder);
    }
}
