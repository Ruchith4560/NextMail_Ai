package com.nextmail.attachment;

import com.nextmail.attachment.dto.AttachmentDownload;
import com.nextmail.attachment.dto.AttachmentResponseDTO;
import com.nextmail.auth.CustomUserDetails;
import com.nextmail.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/attachments")
@RequiredArgsConstructor
@Slf4j
public class AttachmentController {

    private final AttachmentService attachmentService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AttachmentResponseDTO>> uploadAttachment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "messageId", required = false) UUID messageId
    ) throws IOException {
        log.info("User {} uploading attachment: {} ({} bytes)",
                userDetails.getId(), file.getOriginalFilename(), file.getSize());

        AttachmentResponseDTO dto = attachmentService.uploadAttachment(userDetails.getId(), file, messageId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Attachment uploaded successfully", dto));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadAttachment(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID id
    ) {
        log.info("User {} downloading attachment {}", userDetails.getId(), id);
        AttachmentDownload download = attachmentService.downloadAttachment(id, userDetails.getId());

        InputStreamResource resource = new InputStreamResource(download.getInputStream());
        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(download.getContentType());
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + download.getFilename() + "\"")
                .contentType(mediaType)
                .contentLength(download.getContentLength())
                .body(resource);
    }

    @GetMapping("/message/{messageId}")
    public ResponseEntity<ApiResponse<List<AttachmentResponseDTO>>> getAttachmentsByMessage(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable UUID messageId
    ) {
        List<AttachmentResponseDTO> attachments = attachmentService.getAttachmentsByMessage(messageId);
        return ResponseEntity.ok(ApiResponse.ok(attachments));
    }
}
