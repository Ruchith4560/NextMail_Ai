package com.nextmail.ai;

import com.nextmail.mail.event.EmailIngestedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Event listener that asynchronously triggers AI priority classification and
 * summary generation upon successful email ingestion transaction commit.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AiEmailIngestedListener {

    private final AiIntelligenceService aiIntelligenceService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onEmailIngested(EmailIngestedEvent event) {
        log.debug("AI Listener received EmailIngestedEvent for message {}. Evaluating thread {}",
                event.getMessageId(), event.getThreadId());
        try {
            aiIntelligenceService.summarizeThread(event.getThreadId(), event.getUserId());
            log.debug("AI evaluation successfully finished for thread {}", event.getThreadId());
        } catch (Exception ex) {
            log.warn("AI evaluation for thread {} failed gracefully: {}", event.getThreadId(), ex.getMessage());
        }
    }
}
