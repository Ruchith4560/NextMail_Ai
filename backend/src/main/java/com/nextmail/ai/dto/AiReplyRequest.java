package com.nextmail.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request specification for generating an AI draft reply.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiReplyRequest {
    @Builder.Default
    private ReplyTone tone = ReplyTone.PROFESSIONAL;
    private String instructions;
}
