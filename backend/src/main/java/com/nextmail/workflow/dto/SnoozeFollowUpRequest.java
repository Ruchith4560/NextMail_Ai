package com.nextmail.workflow.dto;

import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SnoozeFollowUpRequest {

    // Either additional hours to add or a new absolute dueAt timestamp
    @Positive(message = "additionalHours must be positive")
    private Integer additionalHours;

    private Instant newDueAt;
}
