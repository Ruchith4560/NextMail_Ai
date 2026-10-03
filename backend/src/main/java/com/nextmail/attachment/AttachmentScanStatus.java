package com.nextmail.attachment;

/**
 * Scan lifecycle status for malware analysis and safety quarantine.
 */
public enum AttachmentScanStatus {
    PENDING,
    CLEAN,
    INFECTED,
    QUARANTINED
}
