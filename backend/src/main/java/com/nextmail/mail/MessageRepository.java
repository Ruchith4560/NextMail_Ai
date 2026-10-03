package com.nextmail.mail;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MessageRepository extends JpaRepository<Message, UUID> {

    List<Message> findByThreadIdAndUserIdOrderBySentAtAsc(UUID threadId, UUID userId);

    Optional<Message> findByMessageIdHeaderAndUserId(String messageIdHeader, UUID userId);

    boolean existsByMessageIdHeaderAndUserId(String messageIdHeader, UUID userId);

    Page<Message> findByUserIdAndFolderOrderByReceivedAtDesc(UUID userId, MailFolder folder, Pageable pageable);

    Optional<Message> findByIdAndUserId(UUID id, UUID userId);

    @org.springframework.data.jpa.repository.Query("SELECT m FROM Message m WHERE m.userId = :userId " +
            "AND (:folder IS NULL OR m.folder = :folder) " +
            "AND (:query IS NULL OR :query = '' OR " +
            "     LOWER(m.subject) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "     LOWER(m.bodyText) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "     LOWER(m.senderEmail) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
            "     LOWER(m.senderName) LIKE LOWER(CONCAT('%', :query, '%'))) " +
            "ORDER BY m.receivedAt DESC")
    Page<Message> searchFallback(
            @org.springframework.data.repository.query.Param("userId") UUID userId,
            @org.springframework.data.repository.query.Param("query") String query,
            @org.springframework.data.repository.query.Param("folder") MailFolder folder,
            Pageable pageable);
}
