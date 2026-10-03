package com.nextmail.workflow;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AutomationRuleRepository extends JpaRepository<AutomationRule, UUID> {

    List<AutomationRule> findByUserIdAndIsActiveTrue(UUID userId);

    List<AutomationRule> findByUserIdAndTriggerEventAndIsActiveTrue(UUID userId, RuleTriggerEvent triggerEvent);

    List<AutomationRule> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<AutomationRule> findByIdAndUserId(UUID id, UUID userId);
}
