package com.nextmail.common.health;

import com.nextmail.ai.GeminiAiClient;
import com.nextmail.attachment.storage.StorageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NextMailHealthIndicatorTest {

    @Mock
    private DataSource dataSource;

    @Mock
    private Connection connection;

    @Mock
    private DatabaseMetaData metaData;

    @Mock
    private StorageService storageService;

    @Mock
    private GeminiAiClient geminiAiClient;

    @Test
    @DisplayName("Reports UP status when database is valid and aggregates subsystem telemetry")
    void health_HealthyDatabase_ReturnsUp() throws Exception {
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(2)).thenReturn(true);
        when(connection.getMetaData()).thenReturn(metaData);
        when(metaData.getDatabaseProductName()).thenReturn("PostgreSQL");
        when(metaData.getDatabaseProductVersion()).thenReturn("16.2");

        when(storageService.getStorageEngineName()).thenReturn("S3_MINIO");
        when(geminiAiClient.getModelName()).thenReturn("gemini-1.5-flash");
        when(geminiAiClient.isConfigured()).thenReturn(true);

        NextMailHealthIndicator indicator = new NextMailHealthIndicator(
                Optional.of(dataSource),
                List.of(storageService),
                Optional.of(geminiAiClient),
                Optional.empty()
        );

        Health health = indicator.health();

        assertThat(health.getStatus()).isEqualTo(Status.UP);
        Map<String, Object> details = health.getDetails();
        assertThat(details).containsKey("database");
        assertThat(details).containsKey("objectStorage");
        assertThat(details).containsKey("aiIntelligence");
        assertThat(details).containsKey("searchEngine");
        assertThat(details).containsKey("virtualThreads");

        @SuppressWarnings("unchecked")
        Map<String, Object> dbDetails = (Map<String, Object>) details.get("database");
        assertThat(dbDetails.get("product")).isEqualTo("PostgreSQL");
    }

    @Test
    @DisplayName("Reports DOWN status when database connection check fails")
    void health_UnhealthyDatabase_ReturnsDown() throws Exception {
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.isValid(2)).thenReturn(false);

        NextMailHealthIndicator indicator = new NextMailHealthIndicator(
                Optional.of(dataSource),
                List.of(),
                Optional.empty(),
                Optional.empty()
        );

        Health health = indicator.health();

        assertThat(health.getStatus()).isEqualTo(Status.DOWN);
    }
}
