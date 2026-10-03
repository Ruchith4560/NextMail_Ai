package com.nextmail.workflow;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "automation_rules", indexes = {
        @Index(name = "idx_rule_user_active", columnList = "user_id, is_active")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutomationRule {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_event", nullable = false, length = 32)
    private RuleTriggerEvent triggerEvent;

    @Enumerated(EnumType.STRING)
    @Column(name = "condition_field", nullable = false, length = 32)
    private RuleField field;

    @Enumerated(EnumType.STRING)
    @Column(name = "condition_operator", nullable = false, length = 32)
    private RuleOperator operator;

    @Column(name = "condition_value", length = 255)
    private String conditionValue;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", nullable = false, length = 32)
    private RuleAction action;

    @Column(name = "action_value", length = 255)
    private String actionValue;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Column(name = "execution_count", nullable = false)
    @Builder.Default
    private long executionCount = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
