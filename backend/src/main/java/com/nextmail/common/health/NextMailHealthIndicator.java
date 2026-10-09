package com.nextmail.common.health;

import com.nextmail.ai.GeminiAiClient;
import com.nextmail.attachment.storage.StorageService;
import com.nextmail.search.EmailSearchRepository;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Custom Spring Boot Actuator HealthIndicator providing comprehensive status
 * across all NextMail modular subsystems (PostgreSQL, Storage, Gemini AI, and Search Engine).
 */
@Component
public class NextMailHealthIndicator implements HealthIndicator {

    private final Optional<DataSource> dataSource;
    private final List<StorageService> storageServices;
    private final Optional<GeminiAiClient> geminiAiClient;
    private final Optional<EmailSearchRepository> emailSearchRepository;

    public NextMailHealthIndicator(
            Optional<DataSource> dataSource,
            List<StorageService> storageServices,
            Optional<GeminiAiClient> geminiAiClient,
            Optional<EmailSearchRepository> emailSearchRepository) {
        this.dataSource = dataSource;
        this.storageServices = storageServices != null ? storageServices : List.of();
        this.geminiAiClient = geminiAiClient;
        this.emailSearchRepository = emailSearchRepository;
    }

    @Override
    public Health health() {
        Map<String, Object> details = new HashMap<>();
        boolean isDatabaseHealthy = true;

        // 1. Database check
        if (dataSource.isPresent()) {
            try (Connection conn = dataSource.get().getConnection()) {
                boolean valid = conn.isValid(2);
                if (valid) {
                    details.put("database", Map.of(
                            "status", "UP",
                            "product", conn.getMetaData().getDatabaseProductName(),
                            "version", conn.getMetaData().getDatabaseProductVersion()
                    ));
                } else {
                    isDatabaseHealthy = false;
                    details.put("database", Map.of("status", "DOWN", "error", "Connection invalid"));
                }
            } catch (Exception ex) {
                isDatabaseHealthy = false;
                details.put("database", Map.of("status", "DOWN", "error", ex.getMessage()));
            }
        } else {
            details.put("database", Map.of("status", "UNKNOWN", "message", "No DataSource configured"));
        }

        // 2. Storage engine check
        if (!storageServices.isEmpty()) {
            List<String> engines = storageServices.stream()
                    .map(StorageService::getStorageEngineName)
                    .toList();
            details.put("objectStorage", Map.of(
                    "status", "UP",
                    "availableEngines", engines
            ));
        } else {
            details.put("objectStorage", Map.of("status", "UP", "engine", "LOCAL_FALLBACK"));
        }

        // 3. Gemini AI subsystem
        if (geminiAiClient.isPresent()) {
            GeminiAiClient gemini = geminiAiClient.get();
            details.put("aiIntelligence", Map.of(
                    "status", "UP",
                    "model", gemini.getModelName(),
                    "configured", gemini.isConfigured()
            ));
        } else {
            details.put("aiIntelligence", Map.of("status", "UP", "mode", "HEURISTIC"));
        }

        // 4. Search subsystem
        if (emailSearchRepository.isPresent()) {
            details.put("searchEngine", Map.of(
                    "status", "UP",
                    "mode", "ELASTICSEARCH_PRIMARY"
            ));
        } else {
            details.put("searchEngine", Map.of(
                    "status", "UP",
                    "mode", "POSTGRESQL_JPA_FALLBACK"
            ));
        }

        // 5. Virtual threads check
        details.put("virtualThreads", Map.of(
                "active", Thread.currentThread().isVirtual(),
                "javaVersion", System.getProperty("java.version")
        ));

        if (!isDatabaseHealthy) {
            return Health.down().withDetails(details).build();
        }

        return Health.up().withDetails(details).build();
    }
}
