package com.nextmail.common;

import com.nextmail.common.health.NextMailHealthIndicator;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.actuate.health.Health;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/health")
@RequiredArgsConstructor
public class HealthCheckController {

    private final Optional<NextMailHealthIndicator> healthIndicator;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkHealth() {
        Map<String, Object> healthData = new HashMap<>();
        healthData.put("status", "UP");
        healthData.put("service", "NextMail AI Core");
        healthData.put("version", "0.0.1-SNAPSHOT");
        healthData.put("javaVersion", System.getProperty("java.version"));
        healthData.put("virtualThreadsEnabled", Thread.currentThread().isVirtual());
        healthData.put("timestamp", Instant.now().toString());

        healthIndicator.ifPresent(indicator -> {
            Health h = indicator.health();
            healthData.put("subsystems", h.getDetails());
        });

        return ResponseEntity.ok(ApiResponse.ok("NextMail AI system is operational", healthData));
    }
}
