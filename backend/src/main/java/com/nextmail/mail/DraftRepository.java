package com.nextmail.mail;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DraftRepository extends JpaRepository<Draft, UUID> {
    Page<Draft> findByUserIdOrderByUpdatedAtDesc(UUID userId, Pageable pageable);
    Optional<Draft> findByIdAndUserId(UUID id, UUID userId);
    void deleteByIdAndUserId(UUID id, UUID userId);
}
