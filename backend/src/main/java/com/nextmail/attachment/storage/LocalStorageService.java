package com.nextmail.attachment.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

/**
 * Local filesystem implementation of StorageService.
 * Ideal for development, hermetic testing, and fallback when object storage is offline.
 */
@Service
@Slf4j
public class LocalStorageService implements StorageService {

    private final Path rootLocation;

    public LocalStorageService(@Value("${nextmail.storage.local-dir:./data/attachments}") String localDir) {
        this.rootLocation = Paths.get(localDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.rootLocation);
            log.info("Initialized local attachment storage directory at {}", this.rootLocation);
        } catch (IOException e) {
            log.error("Could not initialize local attachment storage location at {}", this.rootLocation, e);
        }
    }

    @Override
    public String store(String key, InputStream inputStream, long contentLength, String contentType) {
        try {
            Path destinationFile = this.rootLocation.resolve(Paths.get(key)).normalize();
            if (!destinationFile.startsWith(this.rootLocation)) {
                throw new SecurityException("Cannot store file outside current storage directory");
            }
            if (destinationFile.getParent() != null) {
                Files.createDirectories(destinationFile.getParent());
            }
            Files.copy(inputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);
            return destinationFile.toString();
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file locally with key " + key, e);
        }
    }

    @Override
    public InputStream load(String key) {
        try {
            Path file = this.rootLocation.resolve(Paths.get(key)).normalize();
            if (!file.startsWith(this.rootLocation) || !Files.exists(file)) {
                throw new RuntimeException("Could not read file: " + key);
            }
            return Files.newInputStream(file);
        } catch (IOException e) {
            throw new RuntimeException("Failed to read file: " + key, e);
        }
    }

    @Override
    public void delete(String key) {
        try {
            Path file = this.rootLocation.resolve(Paths.get(key)).normalize();
            if (file.startsWith(this.rootLocation)) {
                Files.deleteIfExists(file);
            }
        } catch (IOException e) {
            log.warn("Failed to delete local file with key {}: {}", key, e.getMessage());
        }
    }

    @Override
    public boolean exists(String key) {
        Path file = this.rootLocation.resolve(Paths.get(key)).normalize();
        return file.startsWith(this.rootLocation) && Files.exists(file);
    }

    @Override
    public String getStorageEngineName() {
        return "LOCAL_FS";
    }
}
