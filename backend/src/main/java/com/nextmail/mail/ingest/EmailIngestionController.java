package com.nextmail.mail.ingest;

import com.nextmail.auth.CustomUserDetails;
import com.nextmail.common.ApiResponse;
import com.nextmail.mail.Message;
import com.nextmail.mail.dto.MessageDetailResponse;
import com.nextmail.mail.dto.MessageRecipientDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/mail")
@RequiredArgsConstructor
public class EmailIngestionController {

    private final MimeNormalizationService normalizationService;
    private final IdempotentIngestionService ingestionService;
    private final ImapSyncService imapSyncService;

    @PostMapping("/ingest/raw")
    public ResponseEntity<ApiResponse<MessageDetailResponse>> ingestRawEmail(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody String rawEmlContent
    ) {
        try {
            NormalizedEmail normalized = normalizationService.parseRawEml(rawEmlContent);
            Message message = ingestionService.ingestEmail(userDetails.getId(), normalized);

            MessageDetailResponse response = MessageDetailResponse.builder()
                    .id(message.getId())
                    .threadId(message.getThreadId())
                    .messageIdHeader(message.getMessageIdHeader())
                    .inReplyTo(message.getInReplyTo())
                    .senderEmail(message.getSenderEmail())
                    .senderName(message.getSenderName())
                    .subject(message.getSubject())
                    .bodyText(message.getBodyText())
                    .bodyHtml(message.getBodyHtml())
                    .sentAt(message.getSentAt())
                    .receivedAt(message.getReceivedAt())
                    .isRead(message.isRead())
                    .isStarred(message.isStarred())
                    .isDraft(message.isDraft())
                    .isControlled(message.isControlled())
                    .expiresAt(message.getExpiresAt())
                    .folder(message.getFolder())
                    .hasAttachments(message.isHasAttachments())
                    .recipients(message.getRecipients().stream()
                            .map(r -> MessageRecipientDTO.builder()
                                    .type(r.getType())
                                    .email(r.getEmail())
                                    .name(r.getName())
                                    .build())
                            .toList())
                    .build();

            return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Email ingested successfully", response));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to parse/ingest raw email: " + ex.getMessage()));
        }
    }

    @PostMapping("/sync/imap")
    public ResponseEntity<ApiResponse<Map<String, Object>>> triggerImapSync(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "test@nextmail.local") String username,
            @RequestParam(defaultValue = "secret") String password
    ) {
        int count = imapSyncService.syncMailbox(userDetails.getId(), username, password);
        return ResponseEntity.ok(ApiResponse.ok("IMAP sync complete", Map.of(
                "ingestedCount", count,
                "status", "COMPLETED"
        )));
    }
}
