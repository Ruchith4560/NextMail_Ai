package com.nextmail.mail.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SendMessageRequest {

    @NotEmpty(message = "At least one recipient is required")
    private List<String> to;

    private List<String> cc;
    private List<String> bcc;

    @NotBlank(message = "Subject is required")
    private String subject;

    @NotBlank(message = "Message body is required")
    private String bodyText;

    private String bodyHtml;

    // Optional thread ID if replying to an existing thread
    private UUID threadId;

    // Optional RFC 5322 In-Reply-To header
    private String inReplyTo;

    // NextMail Controlled Envelope policies
    private boolean isControlled;
    private Integer expiryHours;
    @Builder.Default
    private boolean allowForwarding = false;
    @Builder.Default
    private boolean allowPrinting = false;
    @Builder.Default
    private boolean watermarkRecipient = true;

    // Optional attached file IDs
    private List<UUID> attachmentIds;
}

