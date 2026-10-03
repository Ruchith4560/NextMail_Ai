package com.nextmail.mail.ingest;

import com.nextmail.mail.dto.MessageRecipientDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NormalizedEmail {
    private String messageIdHeader;
    private String inReplyTo;
    private String referencesHeader;
    private String senderEmail;
    private String senderName;
    private String subject;
    private String bodyText;
    private String bodyHtml;
    private Instant sentAt;
    private Instant receivedAt;
    @Builder.Default
    private boolean hasAttachments = false;
    @Builder.Default
    private List<MessageRecipientDTO> recipients = new ArrayList<>();
}
