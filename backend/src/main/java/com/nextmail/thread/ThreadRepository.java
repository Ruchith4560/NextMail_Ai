package com.nextmail.thread;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ThreadRepository extends JpaRepository<Thread, UUID> {

    // Standard Inbox (Active, Not Trash, Not Spam, Not Archived)
    Page<Thread> findByUserIdAndIsTrashFalseAndIsSpamFalseAndIsArchivedFalseOrderByLastMessageAtDesc(UUID userId, Pageable pageable);

    // Starred Folder
    Page<Thread> findByUserIdAndIsStarredTrueAndIsTrashFalseOrderByLastMessageAtDesc(UUID userId, Pageable pageable);

    // Archive Folder
    Page<Thread> findByUserIdAndIsArchivedTrueAndIsTrashFalseOrderByLastMessageAtDesc(UUID userId, Pageable pageable);

    // Trash Folder
    Page<Thread> findByUserIdAndIsTrashTrueOrderByLastMessageAtDesc(UUID userId, Pageable pageable);

    // Spam Folder
    Page<Thread> findByUserIdAndIsSpamTrueOrderByLastMessageAtDesc(UUID userId, Pageable pageable);

    // Unread count
    long countByUserIdAndIsReadFalseAndIsTrashFalseAndIsSpamFalseAndIsArchivedFalse(UUID userId);

    // Subject and temporal matching for threading fallback
    List<Thread> findByUserIdAndSubjectNormalizedAndLastMessageAtAfterOrderByLastMessageAtDesc(
            UUID userId, String subjectNormalized, Instant after
    );

    Optional<Thread> findByIdAndUserId(UUID id, UUID userId);
}
