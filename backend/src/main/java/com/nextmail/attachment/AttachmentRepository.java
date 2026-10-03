package com.nextmail.attachment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for attachment entities.
 */
@Repository
public interface AttachmentRepository extends JpaRepository<Attachment, UUID> {

    List<Attachment> findByMessageId(UUID messageId);

    List<Attachment> findByUserId(UUID userId);

    Optional<Attachment> findByIdAndUserId(UUID id, UUID userId);

    Optional<Attachment> findFirstBySha256(String sha256);
}
