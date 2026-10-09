package com.nextmail.common;

import com.nextmail.common.logging.CorrelationIdFilter;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ObservabilityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Actuator health endpoint reports system UP status with subsystem telemetry")
    void actuatorHealth_ReturnsUp() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(header().exists(CorrelationIdFilter.CORRELATION_ID_HEADER));
    }

    @Test
    @DisplayName("Actuator prometheus endpoint produces Prometheus scraping text format")
    void actuatorPrometheus_ExposesMetrics() throws Exception {
        mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("jvm_memory_used_bytes")))
                .andExpect(header().exists(CorrelationIdFilter.CORRELATION_ID_HEADER));
    }

    @Test
    @DisplayName("Health check API attaches generated correlation ID to response headers and body")
    void healthCheckApi_InjectsGeneratedCorrelationId() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(header().exists(CorrelationIdFilter.CORRELATION_ID_HEADER))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.correlationId").isNotEmpty());
    }

    @Test
    @DisplayName("Health check API propagates custom client-supplied X-Correlation-ID")
    void healthCheckApi_PropagatesCustomCorrelationId() throws Exception {
        String clientTraceId = "trace-portfolio-demo-9999";

        mockMvc.perform(get("/api/v1/health")
                        .header(CorrelationIdFilter.CORRELATION_ID_HEADER, clientTraceId))
                .andExpect(status().isOk())
                .andExpect(header().string(CorrelationIdFilter.CORRELATION_ID_HEADER, clientTraceId))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.correlationId").value(clientTraceId));
    }
}
