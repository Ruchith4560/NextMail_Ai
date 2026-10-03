package com.nextmail.workflow;

import com.nextmail.auth.CustomUserDetails;
import com.nextmail.common.ApiResponse;
import com.nextmail.workflow.dto.CreateFollowUpRequest;
import com.nextmail.workflow.dto.FollowUpResponseDTO;
import com.nextmail.workflow.dto.SnoozeFollowUpRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/workflow/followups")
@RequiredArgsConstructor
@Slf4j
public class FollowUpController {

    private final FollowUpService followUpService;

    @PostMapping
    public ResponseEntity<ApiResponse<FollowUpResponseDTO>> createFollowUp(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateFollowUpRequest request
    ) {
        log.info("User {} creating follow-up on thread {}", userDetails.getId(), request.getThreadId());
        FollowUpResponseDTO response = followUpService.createFollowUp(userDetails.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Follow-up reminder scheduled", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<FollowUpResponseDTO>>> getUserFollowUps(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(required = false) FollowUpStatus status
    ) {
        List<FollowUpResponseDTO> followUps = followUpService.getUserFollowUps(userDetails.getId(), status);
        return ResponseEntity.ok(ApiResponse.ok(followUps));
    }

    @GetMapping("/thread/{threadId}")
    public ResponseEntity<ApiResponse<FollowUpResponseDTO>> getFollowUpForThread(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID threadId
    ) {
        return followUpService.getFollowUpForThread(userDetails.getId(), threadId)
                .map(f -> ResponseEntity.ok(ApiResponse.ok(f)))
                .orElseGet(() -> ResponseEntity.ok(ApiResponse.ok(null)));
    }

    @PostMapping("/{id}/snooze")
    public ResponseEntity<ApiResponse<FollowUpResponseDTO>> snoozeFollowUp(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody SnoozeFollowUpRequest request
    ) {
        FollowUpResponseDTO response = followUpService.snoozeFollowUp(userDetails.getId(), id, request);
        return ResponseEntity.ok(ApiResponse.ok("Follow-up reminder snoozed", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> dismissFollowUp(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID id
    ) {
        followUpService.dismissFollowUp(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Follow-up dismissed", null));
    }
}
