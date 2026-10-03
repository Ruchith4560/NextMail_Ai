package com.nextmail.workflow;

import com.nextmail.mail.MessageRepository;
import com.nextmail.thread.Thread;
import com.nextmail.thread.ThreadRepository;
import com.nextmail.workflow.dto.CreateFollowUpRequest;
import com.nextmail.workflow.dto.FollowUpResponseDTO;
import com.nextmail.workflow.dto.SnoozeFollowUpRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FollowUpServiceTest {

    @Mock
    private FollowUpReminderRepository followUpRepository;

    @Mock
    private ThreadRepository threadRepository;

    @Mock
    private MessageRepository messageRepository;

    private FollowUpService followUpService;

    private final UUID testUserId = UUID.randomUUID();
    private final UUID testThreadId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        followUpService = new FollowUpService(followUpRepository, threadRepository, messageRepository);
    }

    @Test
    @DisplayName("Successfully creates a follow-up reminder with future due date")
    void createFollowUp_ValidFutureDate_Success() {
        Thread thread = Thread.builder()
                .id(testThreadId)
                .userId(testUserId)
                .subject("Vendor Renewal Terms")
                .lastMessageAt(Instant.now().minus(2, ChronoUnit.HOURS))
                .build();

        when(threadRepository.findByIdAndUserId(testThreadId, testUserId)).thenReturn(Optional.of(thread));
        when(followUpRepository.findByThreadIdAndStatus(testThreadId, FollowUpStatus.PENDING)).thenReturn(Optional.empty());
        when(followUpRepository.save(any(FollowUpReminder.class))).thenAnswer(inv -> {
            FollowUpReminder r = inv.getArgument(0);
            r.setId(UUID.randomUUID());
            return r;
        });

        CreateFollowUpRequest request = CreateFollowUpRequest.builder()
                .threadId(testThreadId)
                .durationHours(48)
                .condition(FollowUpCondition.NO_REPLY_RECEIVED)
                .note("Follow up on enterprise discount clause")
                .build();

        FollowUpResponseDTO response = followUpService.createFollowUp(testUserId, request);

        assertThat(response).isNotNull();
        assertThat(response.getThreadSubject()).isEqualTo("Vendor Renewal Terms");
        assertThat(response.getStatus()).isEqualTo(FollowUpStatus.PENDING);
        assertThat(response.getCondition()).isEqualTo(FollowUpCondition.NO_REPLY_RECEIVED);
        assertThat(response.getNote()).isEqualTo("Follow up on enterprise discount clause");
        assertThat(response.getDueAt()).isAfter(Instant.now());

        verify(followUpRepository).save(any(FollowUpReminder.class));
    }

    @Test
    @DisplayName("Rejects follow-up creation when due date is in the past")
    void createFollowUp_PastDate_ThrowsException() {
        Thread thread = Thread.builder().id(testThreadId).userId(testUserId).build();
        when(threadRepository.findByIdAndUserId(testThreadId, testUserId)).thenReturn(Optional.of(thread));

        CreateFollowUpRequest request = CreateFollowUpRequest.builder()
                .threadId(testThreadId)
                .dueAt(Instant.now().minus(1, ChronoUnit.HOURS))
                .build();

        assertThatThrownBy(() -> followUpService.createFollowUp(testUserId, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("must be in the future");
    }

    @Test
    @DisplayName("Snoozes follow-up reminder and extends due timestamp")
    void snoozeFollowUp_Success() {
        UUID followUpId = UUID.randomUUID();
        FollowUpReminder reminder = FollowUpReminder.builder()
                .id(followUpId)
                .userId(testUserId)
                .threadId(testThreadId)
                .dueAt(Instant.now().plus(1, ChronoUnit.HOURS))
                .status(FollowUpStatus.PENDING)
                .build();

        when(followUpRepository.findByIdAndUserId(followUpId, testUserId)).thenReturn(Optional.of(reminder));
        when(threadRepository.findById(testThreadId)).thenReturn(Optional.of(Thread.builder().subject("Sprint Planning").build()));
        when(followUpRepository.save(any(FollowUpReminder.class))).thenAnswer(inv -> inv.getArgument(0));

        SnoozeFollowUpRequest snoozeRequest = SnoozeFollowUpRequest.builder()
                .additionalHours(72)
                .build();

        FollowUpResponseDTO snoozed = followUpService.snoozeFollowUp(testUserId, followUpId, snoozeRequest);

        assertThat(snoozed).isNotNull();
        assertThat(snoozed.getDueAt()).isAfter(Instant.now().plus(70, ChronoUnit.HOURS));
        assertThat(snoozed.getStatus()).isEqualTo(FollowUpStatus.PENDING);
    }

    @Test
    @DisplayName("Dismisses follow-up reminder and sets status to DISMISSED")
    void dismissFollowUp_Success() {
        UUID followUpId = UUID.randomUUID();
        FollowUpReminder reminder = FollowUpReminder.builder()
                .id(followUpId)
                .userId(testUserId)
                .threadId(testThreadId)
                .status(FollowUpStatus.PENDING)
                .build();

        when(followUpRepository.findByIdAndUserId(followUpId, testUserId)).thenReturn(Optional.of(reminder));

        followUpService.dismissFollowUp(testUserId, followUpId);

        assertThat(reminder.getStatus()).isEqualTo(FollowUpStatus.DISMISSED);
        assertThat(reminder.getResolvedAt()).isNotNull();
        verify(followUpRepository).save(reminder);
    }
}
