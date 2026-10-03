package com.nextmail.common;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
public class HealthCheckController {

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkHealth() {
        Map<String, Object> healthData = Map.of(
                "status", "UP",
                "service", "NextMail AI Core",
                "version", "0.0.1-SNAPSHOT",
                "javaVersion", System.getProperty("java.version"),
                "virtualThreadsEnabled", Thread.currentThread().isVirtual(),
                "timestamp", Instant.now().toString()
        );
        return ResponseEntity.ok(ApiResponse.ok("NextMail AI system is operational", healthData));
    }
}
