package com.nextmail.workflow;

import com.nextmail.mail.Message;
import com.nextmail.thread.PriorityTier;
import com.nextmail.thread.Thread;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AutomationRuleEngineTest {

    @Mock
    private AutomationRuleRepository ruleRepository;

    @Mock
    private FollowUpReminderRepository followUpRepository;

    private AutomationRuleEngine ruleEngine;

    private final UUID testUserId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        ruleEngine = new AutomationRuleEngine(ruleRepository, followUpRepository);
    }

    @Test
    @DisplayName("Applies MARK_STARRED action when incoming sender matches rule condition")
    void evaluateRules_MatchesSender_StarsMessageAndThread() {
        AutomationRule rule = AutomationRule.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .name("Star Leadership Communications")
                .triggerEvent(RuleTriggerEvent.EMAIL_RECEIVED)
                .field(RuleField.SENDER)
                .operator(RuleOperator.CONTAINS)
                .conditionValue("ceo@enterprise.com")
                .action(RuleAction.MARK_STARRED)
                .isActive(true)
                .executionCount(0L)
                .build();

        Message message = Message.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .senderEmail("ceo@enterprise.com")
                .subject("Quarterly Board Strategy")
                .isStarred(false)
                .build();

        Thread thread = Thread.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .isStarred(false)
                .build();

        when(ruleRepository.findByUserIdAndTriggerEventAndIsActiveTrue(testUserId, RuleTriggerEvent.EMAIL_RECEIVED))
                .thenReturn(List.of(rule));

        ruleEngine.evaluateRules(message, thread, RuleTriggerEvent.EMAIL_RECEIVED);

        assertThat(message.isStarred()).isTrue();
        assertThat(thread.isStarred()).isTrue();
        assertThat(rule.getExecutionCount()).isEqualTo(1L);
        verify(ruleRepository).save(rule);
    }

    @Test
    @DisplayName("Sets URGENT priority tier when subject matches outage keyword")
    void evaluateRules_MatchesSubject_EscalatesPriority() {
        AutomationRule rule = AutomationRule.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .name("Escalate Outage Incidents")
                .triggerEvent(RuleTriggerEvent.EMAIL_RECEIVED)
                .field(RuleField.SUBJECT)
                .operator(RuleOperator.CONTAINS)
                .conditionValue("P0 Outage")
                .action(RuleAction.SET_PRIORITY)
                .actionValue("URGENT")
                .isActive(true)
                .executionCount(2L)
                .build();

        Message message = Message.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .subject("[CRITICAL] P0 Outage in Payment Gateway")
                .build();

        Thread thread = Thread.builder()
                .id(UUID.randomUUID())
                .userId(testUserId)
                .priorityTier(PriorityTier.NORMAL)
                .build();

        when(ruleRepository.findByUserIdAndTriggerEventAndIsActiveTrue(testUserId, RuleTriggerEvent.EMAIL_RECEIVED))
                .thenReturn(List.of(rule));

        ruleEngine.evaluateRules(message, thread, RuleTriggerEvent.EMAIL_RECEIVED);

        assertThat(thread.getPriorityTier()).isEqualTo(PriorityTier.URGENT);
        assertThat(thread.getPriorityReason()).contains("Escalate Outage Incidents");
        assertThat(rule.getExecutionCount()).isEqualTo(3L);
    }
}
