package com.nextmail.workflow;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FollowUpReminderRepository extends JpaRepository<FollowUpReminder, UUID> {

    List<FollowUpReminder> findByStatusAndDueAtBefore(FollowUpStatus status, Instant dueBefore);

    List<FollowUpReminder> findByUserIdAndStatusOrderByDueAtAsc(UUID userId, FollowUpStatus status);

    List<FollowUpReminder> findByUserIdOrderByDueAtAsc(UUID userId);

    Optional<FollowUpReminder> findByThreadIdAndStatus(UUID threadId, FollowUpStatus status);

    List<FollowUpReminder> findByThreadId(UUID threadId);

    Optional<FollowUpReminder> findByIdAndUserId(UUID id, UUID userId);
}
