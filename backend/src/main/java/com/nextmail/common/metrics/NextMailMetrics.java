package com.nextmail.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.util.concurrent.Callable;
import java.util.function.Supplier;

/**
 * Domain-specific metrics service instrumented with Micrometer.
 * Records operational counters, AI latency distributions, search query timers,
 * and zero-trust controlled envelope lifecycles for Prometheus scraping.
 */
@Component
public class NextMailMetrics {

    private final MeterRegistry meterRegistry;

    private final Counter emailsSentCounter;
    private final Counter controlledRevokedCounter;
    private final Counter controlledShreddedCounter;
    private final Counter workflowRulesExecutedCounter;
    private final Counter workflowFollowUpsTriggeredCounter;
    private final Timer searchExecutionTimer;

    public NextMailMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;

        this.emailsSentCounter = Counter.builder("nextmail.emails.sent.total")
                .description("Total number of outbound emails sent via SMTP or internal dispatch")
                .register(meterRegistry);

        this.controlledRevokedCounter = Counter.builder("nextmail.controlled.envelopes.revoked.total")
                .description("Total number of controlled envelopes revoked by senders")
                .register(meterRegistry);

        this.controlledShreddedCounter = Counter.builder("nextmail.controlled.envelopes.shredded.total")
                .description("Total number of expired or revoked payloads permanently destroyed by zero-trust shredder")
                .register(meterRegistry);

        this.workflowRulesExecutedCounter = Counter.builder("nextmail.workflow.rules.executed.total")
                .description("Total number of automated workflow rule actions triggered and executed")
                .register(meterRegistry);

        this.workflowFollowUpsTriggeredCounter = Counter.builder("nextmail.workflow.followups.triggered.total")
                .description("Total number of smart follow-up reminders triggered")
                .register(meterRegistry);

        this.searchExecutionTimer = Timer.builder("nextmail.search.execution.timer")
                .description("Latency distribution of email searches across Elasticsearch and fallback index")
                .register(meterRegistry);
    }

    public void recordEmailIngested(String source) {
        Counter.builder("nextmail.emails.ingested.total")
                .description("Total number of inbound emails normalized and ingested")
                .tag("source", source != null ? source.toLowerCase() : "unknown")
                .register(meterRegistry)
                .increment();
    }

    public void recordEmailSent() {
        emailsSentCounter.increment();
    }

    public void recordControlledRevocation() {
        controlledRevokedCounter.increment();
    }

    public void recordShreddedPayloads(int count) {
        if (count > 0) {
            controlledShreddedCounter.increment(count);
        }
    }

    public void recordRuleExecution() {
        workflowRulesExecutedCounter.increment();
    }

    public void recordFollowUpTriggered() {
        workflowFollowUpsTriggeredCounter.increment();
    }

    public <T> T recordAiReasoning(String operation, Supplier<T> supplier) {
        Timer timer = Timer.builder("nextmail.ai.reasoning.timer")
                .description("Latency distribution of Gemini AI intelligence and reasoning invocations")
                .tag("operation", operation != null ? operation.toLowerCase() : "general")
                .register(meterRegistry);
        return timer.record(supplier);
    }

    public void recordAiReasoning(String operation, Runnable runnable) {
        Timer timer = Timer.builder("nextmail.ai.reasoning.timer")
                .description("Latency distribution of Gemini AI intelligence and reasoning invocations")
                .tag("operation", operation != null ? operation.toLowerCase() : "general")
                .register(meterRegistry);
        timer.record(runnable);
    }

    public <T> T recordSearchExecution(Supplier<T> supplier) {
        return searchExecutionTimer.record(supplier);
    }

    public void recordSearchExecution(Runnable runnable) {
        searchExecutionTimer.record(runnable);
    }

    public MeterRegistry getMeterRegistry() {
        return meterRegistry;
    }
}
