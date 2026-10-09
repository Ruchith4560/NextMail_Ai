package com.nextmail.workflow;

import com.nextmail.mail.Message;
import com.nextmail.thread.PriorityTier;
import com.nextmail.thread.Thread;
import com.nextmail.workflow.dto.CreateRuleRequest;
import com.nextmail.workflow.dto.RuleResponseDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
public class AutomationRuleEngine {

    private final AutomationRuleRepository ruleRepository;
    private final FollowUpReminderRepository followUpRepository;
    private final java.util.Optional<com.nextmail.common.metrics.NextMailMetrics> metrics;

    public AutomationRuleEngine(AutomationRuleRepository ruleRepository, FollowUpReminderRepository followUpRepository) {
        this(ruleRepository, followUpRepository, java.util.Optional.empty());
    }

    @org.springframework.beans.factory.annotation.Autowired
    public AutomationRuleEngine(AutomationRuleRepository ruleRepository,
                                FollowUpReminderRepository followUpRepository,
                                java.util.Optional<com.nextmail.common.metrics.NextMailMetrics> metrics) {
        this.ruleRepository = ruleRepository;
        this.followUpRepository = followUpRepository;
        this.metrics = metrics != null ? metrics : java.util.Optional.empty();
    }

    @Transactional
    public RuleResponseDTO createRule(UUID userId, CreateRuleRequest request) {
        AutomationRule rule = AutomationRule.builder()
                .userId(userId)
                .name(request.getName().trim())
                .triggerEvent(request.getTriggerEvent())
                .field(request.getField())
                .operator(request.getOperator())
                .conditionValue(request.getConditionValue() != null ? request.getConditionValue().trim() : "")
                .action(request.getAction())
                .actionValue(request.getActionValue() != null ? request.getActionValue().trim() : "")
                .isActive(true)
                .executionCount(0L)
                .build();

        rule = ruleRepository.save(rule);
        log.info("Created automation rule {} ('{}') for user {}", rule.getId(), rule.getName(), userId);
        return mapToDTO(rule);
    }

    @Transactional(readOnly = true)
    public List<RuleResponseDTO> getUserRules(UUID userId) {
        return ruleRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::mapToDTO)
                .toList();
    }

    @Transactional
    public RuleResponseDTO toggleRule(UUID userId, UUID ruleId) {
        AutomationRule rule = ruleRepository.findByIdAndUserId(ruleId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Rule not found"));

        rule.setActive(!rule.isActive());
        rule = ruleRepository.save(rule);
        log.info("Toggled rule {} active state to {}", ruleId, rule.isActive());
        return mapToDTO(rule);
    }

    @Transactional
    public void deleteRule(UUID userId, UUID ruleId) {
        AutomationRule rule = ruleRepository.findByIdAndUserId(ruleId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Rule not found"));
        ruleRepository.delete(rule);
        log.info("Deleted automation rule {}", ruleId);
    }

    /**
     * Evaluates active rules matching the trigger event against incoming or outgoing messages.
     */
    @Transactional
    public void evaluateRules(Message message, Thread thread, RuleTriggerEvent event) {
        if (message == null || thread == null) return;

        List<AutomationRule> rules = ruleRepository.findByUserIdAndTriggerEventAndIsActiveTrue(
                message.getUserId(), event);

        for (AutomationRule rule : rules) {
            try {
                if (matchesCondition(rule, message, thread)) {
                    executeAction(rule, message, thread);
                    rule.setExecutionCount(rule.getExecutionCount() + 1);
                    ruleRepository.save(rule);
                    metrics.ifPresent(com.nextmail.common.metrics.NextMailMetrics::recordRuleExecution);
                    log.info("Executed rule '{}' ({}) on message {} in thread {}",
                            rule.getName(), rule.getId(), message.getId(), thread.getId());
                }
            } catch (Exception e) {
                log.warn("Error evaluating rule {} on message {}: {}", rule.getId(), message.getId(), e.getMessage());
            }
        }
    }

    public boolean matchesCondition(AutomationRule rule, Message message, Thread thread) {
        String targetText = switch (rule.getField()) {
            case SENDER -> message.getSenderEmail() != null ? message.getSenderEmail() : "";
            case SUBJECT -> message.getSubject() != null ? message.getSubject() : "";
            case BODY -> message.getBodyText() != null ? message.getBodyText() : "";
            case HAS_ATTACHMENTS -> String.valueOf(message.isHasAttachments());
            case PRIORITY_TIER -> thread.getPriorityTier() != null ? thread.getPriorityTier().name() : "";
            case RECIPIENT -> "";
        };

        String expected = rule.getConditionValue() != null ? rule.getConditionValue() : "";

        return switch (rule.getOperator()) {
            case CONTAINS -> targetText.toLowerCase().contains(expected.toLowerCase());
            case EQUALS -> targetText.equalsIgnoreCase(expected);
            case STARTS_WITH -> targetText.toLowerCase().startsWith(expected.toLowerCase());
            case ENDS_WITH -> targetText.toLowerCase().endsWith(expected.toLowerCase());
            case IS_TRUE -> Boolean.parseBoolean(targetText);
            case IS_FALSE -> !Boolean.parseBoolean(targetText);
        };
    }

    public void executeAction(AutomationRule rule, Message message, Thread thread) {
        switch (rule.getAction()) {
            case MARK_STARRED -> {
                thread.setStarred(true);
                message.setStarred(true);
            }
            case MARK_READ -> {
                thread.setRead(true);
                message.setRead(true);
            }
            case AUTO_ARCHIVE -> thread.setArchived(true);
            case SET_PRIORITY -> {
                try {
                    PriorityTier tier = PriorityTier.valueOf(rule.getActionValue().toUpperCase());
                    thread.setPriorityTier(tier);
                    thread.setPriorityReason("Automated rule: " + rule.getName());
                } catch (Exception ignored) {}
            }
            case CREATE_FOLLOWUP -> {
                int hours = 48;
                try {
                    if (rule.getActionValue() != null && !rule.getActionValue().isBlank()) {
                        hours = Integer.parseInt(rule.getActionValue().trim());
                    }
                } catch (Exception ignored) {}

                FollowUpReminder reminder = FollowUpReminder.builder()
                        .userId(message.getUserId())
                        .threadId(thread.getId())
                        .messageId(message.getId())
                        .dueAt(Instant.now().plus(hours, ChronoUnit.HOURS))
                        .condition(FollowUpCondition.NO_REPLY_RECEIVED)
                        .status(FollowUpStatus.PENDING)
                        .note("Auto-created by rule: " + rule.getName())
                        .originalLastMessageAt(Instant.now())
                        .build();
                followUpRepository.save(reminder);
            }
            case APPLY_LABEL -> {
                // Rule action acknowledged
            }
        }
    }

    private RuleResponseDTO mapToDTO(AutomationRule rule) {
        return RuleResponseDTO.builder()
                .id(rule.getId())
                .userId(rule.getUserId())
                .name(rule.getName())
                .triggerEvent(rule.getTriggerEvent())
                .field(rule.getField())
                .operator(rule.getOperator())
                .conditionValue(rule.getConditionValue())
                .action(rule.getAction())
                .actionValue(rule.getActionValue())
                .isActive(rule.isActive())
                .executionCount(rule.getExecutionCount())
                .createdAt(rule.getCreatedAt())
                .build();
    }
}
