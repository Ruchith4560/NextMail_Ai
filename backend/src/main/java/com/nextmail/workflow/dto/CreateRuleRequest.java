package com.nextmail.workflow.dto;

import com.nextmail.workflow.RuleAction;
import com.nextmail.workflow.RuleField;
import com.nextmail.workflow.RuleOperator;
import com.nextmail.workflow.RuleTriggerEvent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateRuleRequest {

    @NotBlank(message = "Rule name is required")
    private String name;

    @NotNull(message = "triggerEvent is required")
    private RuleTriggerEvent triggerEvent;

    @NotNull(message = "conditionField is required")
    private RuleField field;

    @NotNull(message = "conditionOperator is required")
    private RuleOperator operator;

    private String conditionValue;

    @NotNull(message = "actionType is required")
    private RuleAction action;

    private String actionValue;
}
