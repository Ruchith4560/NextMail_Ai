package com.nextmail.ai;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for persisting and retrieving structured thread AI summaries.
 */
@Repository
public interface ThreadSummaryRepository extends JpaRepository<ThreadSummary, UUID> {

    Optional<ThreadSummary> findByThreadId(UUID threadId);

    Optional<ThreadSummary> findByThreadIdAndUserId(UUID threadId, UUID userId);

    void deleteByThreadId(UUID threadId);
}
