package com.nextmail.search;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.DateFormat;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Elasticsearch document representing an indexed email message for full-text search,
 * boolean filtering, temporal range queries, and relevance ranking.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(indexName = "nextmail_messages", createIndex = false)
public class EmailSearchDocument {

    @Id
    private String id; // Message UUID string

    @Field(type = FieldType.Keyword)
    private String threadId;

    @Field(type = FieldType.Keyword)
    private String userId;

    @Field(type = FieldType.Text, analyzer = "english")
    private String subject;

    @Field(type = FieldType.Text)
    private String snippet;

    @Field(type = FieldType.Text, analyzer = "english")
    private String bodyText;

    @Field(type = FieldType.Keyword)
    private String senderEmail;

    @Field(type = FieldType.Text)
    private String senderName;

    @Field(type = FieldType.Keyword)
    @Builder.Default
    private List<String> recipientEmails = new ArrayList<>();

    @Field(type = FieldType.Keyword)
    private String folder; // INBOX, SENT, ARCHIVE, TRASH, SPAM, DRAFTS

    @Field(type = FieldType.Keyword)
    @Builder.Default
    private List<String> labels = new ArrayList<>();

    @Field(type = FieldType.Boolean)
    private boolean hasAttachments;

    @Field(type = FieldType.Boolean)
    private boolean isStarred;

    @Field(type = FieldType.Boolean)
    private boolean isRead;

    @Field(type = FieldType.Boolean)
    private boolean isControlled;

    @Field(type = FieldType.Date, format = DateFormat.date_time)
    private Instant receivedAt;
}
