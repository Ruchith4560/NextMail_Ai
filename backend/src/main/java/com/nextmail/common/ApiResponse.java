package com.nextmail.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;
import org.slf4j.MDC;

import java.time.Instant;
import java.util.List;

@Value
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {
    boolean success;
    String message;
    T data;
    List<String> errors;
    Instant timestamp;
    String correlationId;

    public static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .data(data)
                .timestamp(Instant.now())
                .correlationId(MDC.get("correlationId"))
                .build();
    }

    public static <T> ApiResponse<T> ok(String message, T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .timestamp(Instant.now())
                .correlationId(MDC.get("correlationId"))
                .build();
    }

    public static <T> ApiResponse<T> error(String message, List<String> errors) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .errors(errors)
                .timestamp(Instant.now())
                .correlationId(MDC.get("correlationId"))
                .build();
    }

    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .timestamp(Instant.now())
                .correlationId(MDC.get("correlationId"))
                .build();
    }
}
