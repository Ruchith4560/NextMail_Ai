package com.nextmail.ai.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Generated draft reply payload with tone metadata and provenance.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiReplyResponse {
    private String suggestedReplyText;
    private ReplyTone tone;
    private String modelUsed;
}
