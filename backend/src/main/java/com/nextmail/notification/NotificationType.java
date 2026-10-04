package com.nextmail.notification;

/**
 * Types of live push notifications dispatched to user devices and WebSocket channels.
 */
public enum NotificationType {
    NEW_EMAIL,
    FOLLOW_UP_DUE,
    AI_SUMMARY_READY,
    SECURITY_ALERT,
    THREAD_PRIORITY_ESCALATED
}
