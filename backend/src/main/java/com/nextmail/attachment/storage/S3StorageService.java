package com.nextmail.attachment.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.*;

import java.io.InputStream;
import java.net.URI;

/**
 * AWS S3 and MinIO object storage implementation.
 * Configured with path-style access for MinIO compatibility and URL connection client
 * for lightweight virtual-thread performance.
 */
@Service
@Slf4j
public class S3StorageService implements StorageService {

    private final S3Client s3Client;
    private final String bucketName;

    public S3StorageService(
            @Value("${nextmail.storage.s3.endpoint:http://localhost:9000}") String endpoint,
            @Value("${nextmail.storage.s3.region:us-east-1}") String region,
            @Value("${nextmail.storage.s3.bucket:nextmail-attachments}") String bucket,
            @Value("${nextmail.storage.s3.access-key:minioadmin}") String accessKey,
            @Value("${nextmail.storage.s3.secret-key:minioadmin}") String secretKey,
            @Value("${nextmail.storage.s3.path-style-access:true}") boolean pathStyleAccess) {

        this.bucketName = bucket;
        S3Client client = null;
        try {
            S3Configuration serviceConfiguration = S3Configuration.builder()
                    .pathStyleAccessEnabled(pathStyleAccess)
                    .build();

            client = S3Client.builder()
                    .endpointOverride(URI.create(endpoint))
                    .region(Region.of(region))
                    .credentialsProvider(StaticCredentialsProvider.create(
                            AwsBasicCredentials.create(accessKey, secretKey)))
                    .serviceConfiguration(serviceConfiguration)
                    .httpClient(UrlConnectionHttpClient.create())
                    .build();

            // Check or initialize bucket
            try {
                client.headBucket(HeadBucketRequest.builder().bucket(bucketName).build());
            } catch (S3Exception ex) {
                try {
                    client.createBucket(CreateBucketRequest.builder().bucket(bucketName).build());
                    log.info("Created S3/MinIO bucket: {}", bucketName);
                } catch (Exception createEx) {
                    log.warn("Could not auto-create S3 bucket {}: {}", bucketName, createEx.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("Failed to initialize S3Client (MinIO/S3 unavailable?): {}", e.getMessage());
        }
        this.s3Client = client;
    }

    public boolean isAvailable() {
        return s3Client != null;
    }

    @Override
    public String store(String key, InputStream inputStream, long contentLength, String contentType) {
        if (s3Client == null) {
            throw new IllegalStateException("S3Client is unavailable");
        }
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .contentLength(contentLength)
                .build();

        s3Client.putObject(request, RequestBody.fromInputStream(inputStream, contentLength));
        return "s3://" + bucketName + "/" + key;
    }

    @Override
    public InputStream load(String key) {
        if (s3Client == null) {
            throw new IllegalStateException("S3Client is unavailable");
        }
        GetObjectRequest request = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        return s3Client.getObject(request);
    }

    @Override
    public void delete(String key) {
        if (s3Client == null) return;
        try {
            DeleteObjectRequest request = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build();
            s3Client.deleteObject(request);
        } catch (Exception ex) {
            log.warn("Failed to delete S3 object {}: {}", key, ex.getMessage());
        }
    }

    @Override
    public boolean exists(String key) {
        if (s3Client == null) return false;
        try {
            s3Client.headObject(HeadObjectRequest.builder().bucket(bucketName).key(key).build());
            return true;
        } catch (NoSuchKeyException ex) {
            return false;
        } catch (Exception ex) {
            return false;
        }
    }

    @Override
    public String getStorageEngineName() {
        return "S3_MINIO";
    }
}
