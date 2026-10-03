package com.nextmail.search;

import com.nextmail.mail.MessageRepository;
import com.nextmail.mail.event.EmailIngestedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Event listener that asynchronously indexes ingested emails into the search engine
 * after the database transaction has successfully committed.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class EmailSearchIndexingListener {

    private final SearchService searchService;
    private final MessageRepository messageRepository;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onEmailIngested(EmailIngestedEvent event) {
        log.debug("Received EmailIngestedEvent for message {}. Triggering search indexing...", event.getMessageId());
        try {
            messageRepository.findById(event.getMessageId()).ifPresent(message -> {
                searchService.indexMessage(message);
                log.debug("Successfully indexed message {} to search engine.", event.getMessageId());
            });
        } catch (Exception ex) {
            log.error("Failed to handle search indexing for message {}: {}", event.getMessageId(), ex.getMessage());
        }
    }
}
