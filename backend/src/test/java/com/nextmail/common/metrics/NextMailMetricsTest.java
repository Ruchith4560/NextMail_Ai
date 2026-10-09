package com.nextmail.common.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class NextMailMetricsTest {

    private MeterRegistry meterRegistry;
    private NextMailMetrics metrics;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        metrics = new NextMailMetrics(meterRegistry);
    }

    @Test
    @DisplayName("Increments email sent and ingested domain counters")
    void recordsEmailsSentAndIngested() {
        metrics.recordEmailSent();
        metrics.recordEmailSent();

        Counter sentCounter = meterRegistry.find("nextmail.emails.sent.total").counter();
        assertThat(sentCounter).isNotNull();
        assertThat(sentCounter.count()).isEqualTo(2.0);

        metrics.recordEmailIngested("api");
        metrics.recordEmailIngested("smtp");

        Counter apiIngested = meterRegistry.find("nextmail.emails.ingested.total").tag("source", "api").counter();
        Counter smtpIngested = meterRegistry.find("nextmail.emails.ingested.total").tag("source", "smtp").counter();

        assertThat(apiIngested).isNotNull();
        assertThat(apiIngested.count()).isEqualTo(1.0);
        assertThat(smtpIngested).isNotNull();
        assertThat(smtpIngested.count()).isEqualTo(1.0);
    }

    @Test
    @DisplayName("Records controlled envelope lifecycle events")
    void recordsControlledEnvelopeMetrics() {
        metrics.recordControlledRevocation();
        metrics.recordShreddedPayloads(7);

        Counter revokedCounter = meterRegistry.find("nextmail.controlled.envelopes.revoked.total").counter();
        Counter shreddedCounter = meterRegistry.find("nextmail.controlled.envelopes.shredded.total").counter();

        assertThat(revokedCounter).isNotNull();
        assertThat(revokedCounter.count()).isEqualTo(1.0);
        assertThat(shreddedCounter).isNotNull();
        assertThat(shreddedCounter.count()).isEqualTo(7.0);
    }

    @Test
    @DisplayName("Records workflow rule and follow-up metrics")
    void recordsWorkflowMetrics() {
        metrics.recordRuleExecution();
        metrics.recordRuleExecution();
        metrics.recordFollowUpTriggered();

        Counter ruleCounter = meterRegistry.find("nextmail.workflow.rules.executed.total").counter();
        Counter followUpCounter = meterRegistry.find("nextmail.workflow.followups.triggered.total").counter();

        assertThat(ruleCounter).isNotNull();
        assertThat(ruleCounter.count()).isEqualTo(2.0);
        assertThat(followUpCounter).isNotNull();
        assertThat(followUpCounter.count()).isEqualTo(1.0);
    }

    @Test
    @DisplayName("Records latency distributions for AI reasoning and Search execution")
    void recordsTimers() {
        String result = metrics.recordAiReasoning("summarize", () -> {
            try {
                Thread.sleep(10);
            } catch (InterruptedException ignored) {}
            return "summary_done";
        });

        assertThat(result).isEqualTo("summary_done");

        Timer aiTimer = meterRegistry.find("nextmail.ai.reasoning.timer").tag("operation", "summarize").timer();
        assertThat(aiTimer).isNotNull();
        assertThat(aiTimer.count()).isEqualTo(1L);
        assertThat(aiTimer.totalTime(TimeUnit.MILLISECONDS)).isGreaterThan(0.0);

        metrics.recordSearchExecution(() -> {
            try {
                Thread.sleep(10);
            } catch (InterruptedException ignored) {}
        });

        Timer searchTimer = meterRegistry.find("nextmail.search.execution.timer").timer();
        assertThat(searchTimer).isNotNull();
        assertThat(searchTimer.count()).isEqualTo(1L);
    }
}
