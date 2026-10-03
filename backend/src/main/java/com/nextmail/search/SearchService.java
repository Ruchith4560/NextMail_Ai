package com.nextmail.search;

import com.nextmail.mail.MailFolder;
import com.nextmail.mail.Message;
import com.nextmail.mail.MessageRecipient;
import com.nextmail.mail.MessageRepository;
import com.nextmail.search.dto.SearchCriteria;
import com.nextmail.search.dto.SearchPageResponse;
import com.nextmail.search.dto.SearchResultDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.SearchHit;
import org.springframework.data.elasticsearch.core.SearchHits;
import org.springframework.data.elasticsearch.core.query.Criteria;
import org.springframework.data.elasticsearch.core.query.CriteriaQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * High-performance search service with dual-strategy execution:
 * 1. Primary: Elasticsearch 8.x for full-text tokenized search, n-gram matching, and relevance ranking.
 * 2. Secondary (Resiliency Fallback): PostgreSQL JPA search when Elasticsearch is unreachable or during CI testing.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SearchService {

    private final MessageRepository messageRepository;

    @Autowired(required = false)
    private EmailSearchRepository emailSearchRepository;

    @Autowired(required = false)
    private ElasticsearchOperations elasticsearchOperations;

    /**
     * Executes natural language and structured search for a given user.
     */
    @Transactional(readOnly = true)
    public SearchPageResponse search(UUID userId, SearchCriteria criteria) {
        int page = Math.max(0, criteria.getPage());
        int size = criteria.getSize() > 0 ? criteria.getSize() : 20;
        Pageable pageable = PageRequest.of(page, size);

        // Attempt Elasticsearch search first if beans are initialized
        if (elasticsearchOperations != null && emailSearchRepository != null) {
            try {
                return executeElasticsearchQuery(userId, criteria, pageable);
            } catch (Exception ex) {
                log.warn("Elasticsearch query failed (falling back to PostgreSQL JPA search): {}", ex.getMessage());
            }
        }

        // Graceful degradation: PostgreSQL JPA query fallback
        return executePostgresFallback(userId, criteria, pageable);
    }

    private SearchPageResponse executeElasticsearchQuery(UUID userId, SearchCriteria criteria, Pageable pageable) {
        Criteria esCriteria = new Criteria("userId").is(userId.toString());

        // Text query multi-field search
        if (criteria.getQuery() != null && !criteria.getQuery().trim().isEmpty()) {
            String queryStr = criteria.getQuery().trim();
            Criteria textSearch = new Criteria("subject").contains(queryStr)
                    .or(new Criteria("snippet").contains(queryStr))
                    .or(new Criteria("bodyText").contains(queryStr))
                    .or(new Criteria("senderName").contains(queryStr))
                    .or(new Criteria("senderEmail").contains(queryStr));
            esCriteria = esCriteria.subCriteria(textSearch);
        }

        // Folder filter
        if (criteria.getFolder() != null && !criteria.getFolder().isBlank()) {
            esCriteria = esCriteria.and(new Criteria("folder").is(criteria.getFolder().toUpperCase()));
        }

        // Attachment filter
        if (criteria.getHasAttachments() != null) {
            esCriteria = esCriteria.and(new Criteria("hasAttachments").is(criteria.getHasAttachments()));
        }

        // Starred filter
        if (criteria.getIsStarred() != null) {
            esCriteria = esCriteria.and(new Criteria("isStarred").is(criteria.getIsStarred()));
        }

        // Read/unread filter
        if (criteria.getIsRead() != null) {
            esCriteria = esCriteria.and(new Criteria("isRead").is(criteria.getIsRead()));
        }

        CriteriaQuery query = new CriteriaQuery(esCriteria);
        query.setPageable(pageable);

        SearchHits<EmailSearchDocument> searchHits = elasticsearchOperations.search(query, EmailSearchDocument.class);

        List<SearchResultDTO> results = new ArrayList<>();
        for (SearchHit<EmailSearchDocument> hit : searchHits.getSearchHits()) {
            EmailSearchDocument doc = hit.getContent();
            float score = hit.getScore();

            String highlightedSnippet = doc.getSnippet();
            if (criteria.getQuery() != null && !criteria.getQuery().isBlank()) {
                highlightedSnippet = highlightText(doc.getSnippet() != null ? doc.getSnippet() : "", criteria.getQuery());
            }

            results.add(SearchResultDTO.builder()
                    .messageId(doc.getId())
                    .threadId(doc.getThreadId())
                    .subject(doc.getSubject())
                    .snippet(doc.getSnippet())
                    .highlightedSnippet(highlightedSnippet)
                    .senderEmail(doc.getSenderEmail())
                    .senderName(doc.getSenderName())
                    .recipientEmails(doc.getRecipientEmails())
                    .folder(doc.getFolder())
                    .labels(doc.getLabels())
                    .hasAttachments(doc.isHasAttachments())
                    .isStarred(doc.isStarred())
                    .isRead(doc.isRead())
                    .isControlled(doc.isControlled())
                    .receivedAt(doc.getReceivedAt())
                    .score(score)
                    .build());
        }

        long totalHits = searchHits.getTotalHits();
        int totalPages = (int) Math.ceil((double) totalHits / size(pageable));

        return SearchPageResponse.builder()
                .content(results)
                .page(pageable.getPageNumber())
                .size(pageable.getPageSize())
                .totalElements(totalHits)
                .totalPages(totalPages)
                .hasNext(pageable.getPageNumber() + 1 < totalPages)
                .executedByEngine("ELASTICSEARCH")
                .build();
    }

    private SearchPageResponse executePostgresFallback(UUID userId, SearchCriteria criteria, Pageable pageable) {
        MailFolder folder = null;
        if (criteria.getFolder() != null && !criteria.getFolder().isBlank()) {
            try {
                folder = MailFolder.valueOf(criteria.getFolder().toUpperCase());
            } catch (IllegalArgumentException ignored) {
            }
        }

        String queryTerm = criteria.getQuery() != null ? criteria.getQuery().trim() : "";
        Page<Message> messagePage = messageRepository.searchFallback(userId, queryTerm, folder, pageable);

        List<SearchResultDTO> results = messagePage.getContent().stream()
                .map(msg -> {
                    String snippet = extractSnippet(msg.getBodyText());
                    String highlighted = snippet;
                    if (!queryTerm.isEmpty()) {
                        highlighted = highlightText(snippet, queryTerm);
                    }
                    List<String> recipientEmails = msg.getRecipients() != null
                            ? msg.getRecipients().stream().map(MessageRecipient::getEmail).toList()
                            : List.of();

                    return SearchResultDTO.builder()
                            .messageId(msg.getId().toString())
                            .threadId(msg.getThreadId() != null ? msg.getThreadId().toString() : null)
                            .subject(msg.getSubject())
                            .snippet(snippet)
                            .highlightedSnippet(highlighted)
                            .senderEmail(msg.getSenderEmail())
                            .senderName(msg.getSenderName())
                            .recipientEmails(recipientEmails)
                            .folder(msg.getFolder() != null ? msg.getFolder().name() : "INBOX")
                            .labels(List.of())
                            .hasAttachments(msg.isHasAttachments())
                            .isStarred(msg.isStarred())
                            .isRead(msg.isRead())
                            .isControlled(msg.isControlled())
                            .receivedAt(msg.getReceivedAt())
                            .score(1.0f)
                            .build();
                })
                .toList();

        return SearchPageResponse.builder()
                .content(results)
                .page(messagePage.getNumber())
                .size(messagePage.getSize())
                .totalElements(messagePage.getTotalElements())
                .totalPages(messagePage.getTotalPages())
                .hasNext(messagePage.hasNext())
                .executedByEngine("POSTGRES_FALLBACK")
                .build();
    }

    /**
     * Index a single message into Elasticsearch asynchronously or synchronously.
     */
    public void indexMessage(Message message) {
        if (emailSearchRepository == null || message == null) {
            return;
        }

        try {
            EmailSearchDocument doc = toDocument(message);
            emailSearchRepository.save(doc);
            log.debug("Indexed message {} into Elasticsearch", message.getId());
        } catch (Exception ex) {
            log.warn("Failed to index message {} to Elasticsearch: {}", message.getId(), ex.getMessage());
        }
    }

    /**
     * Deletes a message from the Elasticsearch index.
     */
    public void deleteMessageIndex(UUID messageId) {
        if (emailSearchRepository == null || messageId == null) {
            return;
        }

        try {
            emailSearchRepository.deleteById(messageId.toString());
            log.debug("Deleted message {} from Elasticsearch index", messageId);
        } catch (Exception ex) {
            log.warn("Failed to delete message {} from Elasticsearch: {}", messageId, ex.getMessage());
        }
    }

    /**
     * Bulk re-index all messages for a specific user from PostgreSQL into Elasticsearch.
     */
    @Transactional(readOnly = true)
    public int reindexAllForUser(UUID userId) {
        if (emailSearchRepository == null) {
            return 0;
        }

        Page<Message> allMessages = messageRepository.searchFallback(userId, "", null, PageRequest.of(0, 1000));
        List<EmailSearchDocument> docs = allMessages.getContent().stream()
                .map(this::toDocument)
                .toList();

        try {
            if (!docs.isEmpty()) {
                emailSearchRepository.saveAll(docs);
                log.info("Successfully re-indexed {} messages for user {}", docs.size(), userId);
            }
        } catch (Exception ex) {
            log.warn("Elasticsearch bulk re-index failed (cluster unavailable?): {}", ex.getMessage());
        }
        return docs.size();
    }

    public EmailSearchDocument toDocument(Message message) {
        List<String> recipientEmails = message.getRecipients() != null
                ? message.getRecipients().stream().map(MessageRecipient::getEmail).toList()
                : List.of();

        String snippet = extractSnippet(message.getBodyText());

        return EmailSearchDocument.builder()
                .id(message.getId().toString())
                .threadId(message.getThreadId() != null ? message.getThreadId().toString() : null)
                .userId(message.getUserId() != null ? message.getUserId().toString() : null)
                .subject(message.getSubject())
                .snippet(snippet)
                .bodyText(message.getBodyText())
                .senderEmail(message.getSenderEmail())
                .senderName(message.getSenderName())
                .recipientEmails(recipientEmails)
                .folder(message.getFolder() != null ? message.getFolder().name() : "INBOX")
                .labels(List.of())
                .hasAttachments(message.isHasAttachments())
                .isStarred(message.isStarred())
                .isRead(message.isRead())
                .isControlled(message.isControlled())
                .receivedAt(message.getReceivedAt() != null ? message.getReceivedAt() : Instant.now())
                .build();
    }

    public String extractSnippet(String bodyText) {
        if (bodyText == null || bodyText.isBlank()) {
            return "";
        }
        String clean = bodyText.replaceAll("\\s+", " ").trim();
        return clean.length() > 160 ? clean.substring(0, 160) + "..." : clean;
    }

    public String highlightText(String text, String query) {
        if (text == null || query == null || query.isBlank()) {
            return text;
        }
        return text.replaceAll("(?i)(" + java.util.regex.Pattern.quote(query) + ")",
                "<mark class=\"bg-amber-400/25 text-amber-200 px-0.5 rounded\">$1</mark>");
    }

    private int size(Pageable pageable) {
        return pageable.getPageSize() > 0 ? pageable.getPageSize() : 20;
    }
}
