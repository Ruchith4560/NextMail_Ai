package com.nextmail.workflow.dto;

import com.nextmail.workflow.RuleAction;
import com.nextmail.workflow.RuleField;
import com.nextmail.workflow.RuleOperator;
import com.nextmail.workflow.RuleTriggerEvent;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RuleResponseDTO {
    private UUID id;
    private UUID userId;
    private String name;
    private RuleTriggerEvent triggerEvent;
    private RuleField field;
    private RuleOperator operator;
    private String conditionValue;
    private RuleAction action;
    private String actionValue;
    private boolean isActive;
    private long executionCount;
    private Instant createdAt;
}
