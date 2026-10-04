package com.nextmail.workflow.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
public class FollowUpTriggeredEvent {
    private final UUID reminderId;
    private final UUID userId;
    private final UUID threadId;
    private final String threadSubject;
    private final String note;
}
