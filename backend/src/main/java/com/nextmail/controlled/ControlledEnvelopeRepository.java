package com.nextmail.controlled;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ControlledEnvelopeRepository extends JpaRepository<ControlledEnvelope, UUID> {

    Optional<ControlledEnvelope> findByMessageId(UUID messageId);

    List<ControlledEnvelope> findBySenderIdOrderByCreatedAtDesc(UUID senderId);

    List<ControlledEnvelope> findByExpiresAtBeforeAndIsPayloadShreddedFalse(Instant threshold);
}
