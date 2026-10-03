package com.nextmail.mail.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
public class EmailIngestedEvent {
    private final UUID messageId;
    private final UUID threadId;
    private final UUID userId;
    private final String subject;
    private final String bodyText;
    private final String senderEmail;
    private final Instant sentAt;
}
