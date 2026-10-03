package com.nextmail.ai;

import com.nextmail.ai.dto.AiReplyRequest;
import com.nextmail.ai.dto.AiReplyResponse;
import com.nextmail.ai.dto.AiSummaryResponse;
import com.nextmail.auth.CustomUserDetails;
import com.nextmail.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST controller for NextMail AI Conversation Intelligence and Reply Assistant.
 */
@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiIntelligenceService aiIntelligenceService;

    @GetMapping("/threads/{threadId}/summary")
    public ResponseEntity<ApiResponse<AiSummaryResponse>> getThreadSummary(
            @PathVariable UUID threadId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        AiSummaryResponse response = aiIntelligenceService.summarizeThread(threadId, userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok("Thread summary generated successfully", response));
    }

    @PostMapping("/threads/{threadId}/reply")
    public ResponseEntity<ApiResponse<AiReplyResponse>> generateDraftReply(
            @PathVariable UUID threadId,
            @RequestBody @Valid AiReplyRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        AiReplyResponse response = aiIntelligenceService.generateDraftReply(threadId, userDetails.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Draft reply generated successfully", response));
    }
}
