package com.nextmail.controlled;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface EnvelopeAuditLogRepository extends JpaRepository<EnvelopeAuditLog, UUID> {

    List<EnvelopeAuditLog> findByMessageIdOrderByCreatedAtDesc(UUID messageId);

    long countByMessageIdAndEventType(UUID messageId, EnvelopeAuditEvent eventType);
}
