package com.nextmail.mail.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaveDraftRequest {
    private UUID id;
    private UUID threadId;
    private String toRecipients;
    private String ccRecipients;
    private String bccRecipients;
    private String subject;
    private String bodyText;
    private boolean isControlled;
    private Integer expiryHours;
}
