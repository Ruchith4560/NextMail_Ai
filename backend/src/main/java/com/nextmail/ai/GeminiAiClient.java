package com.nextmail.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Client for interacting with Google Gemini LLM API (gemini-1.5-flash) via Spring RestClient.
 * Employs structured JSON schema output and virtual-thread-compatible I/O with graceful heuristic fallback.
 */
@Component
@Slf4j
public class GeminiAiClient {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    @Value("${nextmail.ai.gemini.api-key:}")
    private String apiKey;

    @Value("${nextmail.ai.gemini.model:gemini-1.5-flash}")
    private String model;

    @Value("${nextmail.ai.gemini.temperature:0.2}")
    private double temperature;

    public GeminiAiClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta")
                .build();
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.trim().isEmpty();
    }

    public String getModelName() {
        return isConfigured() ? model : "heuristic-intelligence";
    }

    /**
     * Executes a structured JSON prompt against Google Gemini.
     * Returns raw JSON string if successful, or null on network/API failure for graceful fallback.
     */
    public String generateStructuredJson(String systemInstruction, String userContent) {
        if (!isConfigured()) {
            log.debug("Gemini API key is not configured; deferring to local heuristic reasoning engine.");
            return null;
        }

        try {
            String url = String.format("/models/%s:generateContent?key=%s", model, apiKey);

            Map<String, Object> payload = Map.of(
                    "contents", List.of(
                            Map.of("role", "user", "parts", List.of(
                                    Map.of("text", systemInstruction + "\n\n=== CONTEXT ===\n" + userContent)
                            ))
                    ),
                    "generationConfig", Map.of(
                            "temperature", temperature,
                            "responseMimeType", "application/json"
                    )
            );

            String responseBody = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            if (responseBody != null) {
                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode candidatePart = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
                if (!candidatePart.isMissingNode()) {
                    return candidatePart.asText();
                }
            }
        } catch (Exception ex) {
            log.warn("Gemini API call failed (degrading to local reasoning): {}", ex.getMessage());
        }
        return null;
    }
}
