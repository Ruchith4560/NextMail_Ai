package com.nextmail.controlled;

import com.nextmail.auth.CustomUserDetails;
import com.nextmail.common.ApiResponse;
import com.nextmail.controlled.dto.ControlledEnvelopeDTO;
import com.nextmail.controlled.dto.EnvelopeAuditLogDTO;
import com.nextmail.controlled.dto.RevokeEnvelopeRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/controlled")
@RequiredArgsConstructor
@Slf4j
public class ControlledEnvelopeController {

    private final ControlledEnvelopeService controlledEnvelopeService;

    @GetMapping("/{messageId}/status")
    public ResponseEntity<ApiResponse<ControlledEnvelopeDTO>> getStatus(
            @PathVariable UUID messageId
    ) {
        return controlledEnvelopeService.getEnvelopeDTO(messageId)
                .map(dto -> ResponseEntity.ok(ApiResponse.ok(dto)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{messageId}/revoke")
    public ResponseEntity<ApiResponse<ControlledEnvelopeDTO>> revokeEnvelope(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID messageId,
            @RequestBody(required = false) RevokeEnvelopeRequest request
    ) {
        String reason = request != null ? request.getReason() : null;
        ControlledEnvelope updated = controlledEnvelopeService.revokeEnvelope(
                userDetails.getId(),
                messageId,
                reason
        );
        return ResponseEntity.ok(ApiResponse.ok("Controlled envelope revoked successfully",
                controlledEnvelopeService.mapToDTO(updated)));
    }

    @GetMapping("/{messageId}/audit-logs")
    public ResponseEntity<ApiResponse<List<EnvelopeAuditLogDTO>>> getAuditLogs(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID messageId
    ) {
        List<EnvelopeAuditLogDTO> logs = controlledEnvelopeService.getAuditLogs(userDetails.getId(), messageId);
        return ResponseEntity.ok(ApiResponse.ok(logs));
    }
}
