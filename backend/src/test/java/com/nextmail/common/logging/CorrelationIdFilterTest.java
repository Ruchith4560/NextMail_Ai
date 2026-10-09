package com.nextmail.common.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class CorrelationIdFilterTest {

    private CorrelationIdFilter filter;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        filter = new CorrelationIdFilter();
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        MDC.clear();
    }

    @AfterEach
    void tearDown() {
        MDC.clear();
    }

    @Test
    @DisplayName("Generates new UUID correlation ID when header is missing")
    void doFilter_MissingHeader_GeneratesNewUuid() throws ServletException, IOException {
        AtomicReference<String> mdcValueInsideChain = new AtomicReference<>();

        FilterChain chain = (req, res) -> {
            mdcValueInsideChain.set(MDC.get(CorrelationIdFilter.MDC_KEY));
        };

        filter.doFilter(request, response, chain);

        String responseHeader = response.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER);
        assertThat(responseHeader).isNotNull().isNotBlank();
        assertThat(mdcValueInsideChain.get()).isEqualTo(responseHeader);
        assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull(); // Verified cleaned up after request
    }

    @Test
    @DisplayName("Preserves and propagates incoming X-Correlation-ID header")
    void doFilter_ExistingHeader_PreservesCorrelationId() throws ServletException, IOException {
        String customId = "trace-client-abc-12345";
        request.addHeader(CorrelationIdFilter.CORRELATION_ID_HEADER, customId);

        AtomicReference<String> mdcValueInsideChain = new AtomicReference<>();

        FilterChain chain = (req, res) -> {
            mdcValueInsideChain.set(MDC.get(CorrelationIdFilter.MDC_KEY));
        };

        filter.doFilter(request, response, chain);

        String responseHeader = response.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER);
        assertThat(responseHeader).isEqualTo(customId);
        assertThat(mdcValueInsideChain.get()).isEqualTo(customId);
        assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
    }
}
