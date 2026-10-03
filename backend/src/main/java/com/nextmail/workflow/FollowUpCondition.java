package com.nextmail.workflow;

/**
 * Trigger condition governing when a follow-up reminder fires.
 */
public enum FollowUpCondition {
    /**
     * Fires only if no inbound reply has been received from thread participants before the due timestamp.
     * If a reply arrives in the interim, the reminder is automatically resolved.
     */
    NO_REPLY_RECEIVED,

    /**
     * Always fires at the scheduled timestamp regardless of intermediate message activity.
     */
    ALWAYS_REMIND,

    /**
     * Nudges user if thread remains unread or unarchived after inactivity threshold.
     */
    INBOX_ZERO_NUDGE
}
