package com.nextmail.workflow;

import com.nextmail.auth.CustomUserDetails;
import com.nextmail.common.ApiResponse;
import com.nextmail.workflow.dto.CreateRuleRequest;
import com.nextmail.workflow.dto.RuleResponseDTO;
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
@RequestMapping("/api/v1/workflow/rules")
@RequiredArgsConstructor
@Slf4j
public class WorkflowRuleController {

    private final AutomationRuleEngine ruleEngine;

    @PostMapping
    public ResponseEntity<ApiResponse<RuleResponseDTO>> createRule(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody CreateRuleRequest request
    ) {
        log.info("User {} creating automation rule '{}'", userDetails.getId(), request.getName());
        RuleResponseDTO response = ruleEngine.createRule(userDetails.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Automation rule created", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RuleResponseDTO>>> getUserRules(
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        List<RuleResponseDTO> rules = ruleEngine.getUserRules(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(rules));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<ApiResponse<RuleResponseDTO>> toggleRule(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID id
    ) {
        RuleResponseDTO response = ruleEngine.toggleRule(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Rule state toggled", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteRule(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID id
    ) {
        ruleEngine.deleteRule(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Rule deleted successfully", null));
    }
}
