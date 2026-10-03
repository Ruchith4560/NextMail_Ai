package com.nextmail.attachment.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.InputStream;

/**
 * Data transfer object encapsulating binary attachment stream and download headers.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttachmentDownload {
    private String filename;
    private String contentType;
    private long contentLength;
    private InputStream inputStream;
}
