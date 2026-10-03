package com.nextmail.mail;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LabelRepository extends JpaRepository<Label, UUID> {
    List<Label> findByUserIdOrderByNameAsc(UUID userId);
    Optional<Label> findByUserIdAndName(UUID userId, String name);
}
