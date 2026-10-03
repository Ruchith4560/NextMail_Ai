package com.nextmail.mail.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.nextmail.mail.MailFolder;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageDetailResponse {
    private UUID id;
    private UUID threadId;
    private String messageIdHeader;
    private String inReplyTo;
    private String senderEmail;
    private String senderName;
    private String subject;
    private String bodyText;
    private String bodyHtml;
    private Instant sentAt;
    private Instant receivedAt;

    @JsonProperty("isRead")
    private boolean isRead;

    @JsonProperty("isStarred")
    private boolean isStarred;

    @JsonProperty("isDraft")
    private boolean isDraft;

    @JsonProperty("isControlled")
    private boolean isControlled;

    private Instant expiresAt;
    private MailFolder folder;

    @JsonProperty("hasAttachments")
    private boolean hasAttachments;

    private List<MessageRecipientDTO> recipients;
}
