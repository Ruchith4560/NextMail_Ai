package com.nextmail.workflow;

/**
 * State lifecycle of a follow-up reminder.
 */
public enum FollowUpStatus {
    /**
     * Active reminder scheduled for evaluation.
     */
    PENDING,

    /**
     * Reminder reached due timestamp and triggered an alert/priority escalation.
     */
    TRIGGERED,

    /**
     * Auto-resolved because an inbound reply arrived before deadline (for NO_REPLY_RECEIVED condition).
     */
    AUTO_RESOLVED,

    /**
     * Postponed by the user to a later timestamp.
     */
    SNOOZED,

    /**
     * Explicitly dismissed or deleted by user.
     */
    DISMISSED
}
