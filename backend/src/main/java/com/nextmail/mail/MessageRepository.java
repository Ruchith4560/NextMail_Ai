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
}
