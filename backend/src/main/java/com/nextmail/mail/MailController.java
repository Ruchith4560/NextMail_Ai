package com.nextmail.mail;

import com.nextmail.auth.CustomUserDetails;
import com.nextmail.common.ApiResponse;
import com.nextmail.mail.dto.MessageDetailResponse;
import com.nextmail.mail.dto.SaveDraftRequest;
import com.nextmail.mail.dto.SendMessageRequest;
import com.nextmail.thread.dto.ThreadDetailResponse;
import com.nextmail.thread.dto.ThreadSummaryResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/mail")
@RequiredArgsConstructor
public class MailController {

    private final MailService mailService;

    @GetMapping("/threads")
    public ResponseEntity<ApiResponse<Page<ThreadSummaryResponse>>> getThreads(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "INBOX") MailFolder folder,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size
    ) {
        Page<ThreadSummaryResponse> threads = mailService.getThreads(userDetails.getId(), folder, page, size);
        return ResponseEntity.ok(ApiResponse.ok(threads));
    }

    @GetMapping("/threads/{id}")
    public ResponseEntity<ApiResponse<ThreadDetailResponse>> getThreadDetail(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID id
    ) {
        ThreadDetailResponse detail = mailService.getThreadDetail(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok(detail));
    }

    @PostMapping("/send")
    public ResponseEntity<ApiResponse<MessageDetailResponse>> sendMessage(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @Valid @RequestBody SendMessageRequest request
    ) {
        MessageDetailResponse sent = mailService.sendMessage(
                userDetails.getId(),
                userDetails.getEmail(),
                userDetails.getFullName(),
                request
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Message sent", sent));
    }

    @PatchMapping("/threads/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markRead(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID id,
            @RequestParam(defaultValue = "true") boolean isRead
    ) {
        mailService.markThreadRead(userDetails.getId(), id, isRead);
        return ResponseEntity.ok(ApiResponse.ok("Thread read status updated", null));
    }

    @PatchMapping("/threads/{id}/star")
    public ResponseEntity<ApiResponse<Void>> toggleStar(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID id
    ) {
        mailService.toggleThreadStar(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Thread star status toggled", null));
    }

    @PatchMapping("/threads/{id}/archive")
    public ResponseEntity<ApiResponse<Void>> archiveThread(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID id
    ) {
        mailService.archiveThread(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Thread archived", null));
    }

    @DeleteMapping("/threads/{id}")
    public ResponseEntity<ApiResponse<Void>> trashThread(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID id
    ) {
        mailService.trashThread(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Thread moved to trash", null));
    }

    @PostMapping("/drafts")
    public ResponseEntity<ApiResponse<Draft>> saveDraft(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestBody SaveDraftRequest request
    ) {
        Draft draft = mailService.saveDraft(userDetails.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Draft saved", draft));
    }

    @GetMapping("/drafts")
    public ResponseEntity<ApiResponse<Page<Draft>>> getDrafts(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Page<Draft> drafts = mailService.getDrafts(userDetails.getId(), page, size);
        return ResponseEntity.ok(ApiResponse.ok(drafts));
    }

    @DeleteMapping("/drafts/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDraft(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID id
    ) {
        mailService.deleteDraft(userDetails.getId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Draft discarded", null));
    }
}
