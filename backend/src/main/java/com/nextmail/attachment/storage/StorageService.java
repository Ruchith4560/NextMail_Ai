package com.nextmail.attachment.storage;

import java.io.InputStream;

/**
 * Storage provider abstraction supporting local filesystem and S3/MinIO backends.
 */
public interface StorageService {

    String store(String key, InputStream inputStream, long contentLength, String contentType);

    InputStream load(String key);

    void delete(String key);

    boolean exists(String key);

    String getStorageEngineName();
}
