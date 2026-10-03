package com.nextmail.thread;

import com.nextmail.mail.Message;
import com.nextmail.mail.MessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class JwzThreadingService {

    private final ThreadRepository threadRepository;
    private final MessageRepository messageRepository;

    // Regex to match international email reply/forward prefixes: Re:, Fwd:, Fw:, AW:, SV:, VS:, etc.
    private static final Pattern SUBJECT_PREFIX_PATTERN = Pattern.compile(
            "(?i)^(\\s*(re|fwd|fw|aw|sv|vs|ref|antwort)(\\[\\d+\\])?\\s*:\\s*)+",
            Pattern.CASE_INSENSITIVE
    );

    public String normalizeSubject(String rawSubject) {
        if (rawSubject == null || rawSubject.isBlank()) {
            return "(No Subject)";
        }
        String cleaned = SUBJECT_PREFIX_PATTERN.matcher(rawSubject.trim()).replaceAll("");
        cleaned = cleaned.replaceAll("\\s+", " ").trim();
        return cleaned.isEmpty() ? "(No Subject)" : cleaned;
    }

    @Transactional
    public Thread resolveOrCreateThread(
            UUID userId,
            String subject,
            String inReplyTo,
            String referencesHeader,
            String snippet,
            Instant timestamp,
            boolean hasAttachments
    ) {
        String normalizedSubject = normalizeSubject(subject);

        // 1. Direct In-Reply-To header matching
        if (inReplyTo != null && !inReplyTo.isBlank()) {
            Optional<Message> parentMsg = messageRepository.findByMessageIdHeaderAndUserId(inReplyTo.trim(), userId);
            if (parentMsg.isPresent()) {
                Optional<Thread> existingThread = threadRepository.findByIdAndUserId(parentMsg.get().getThreadId(), userId);
                if (existingThread.isPresent()) {
                    log.debug("JWZ: Matched thread {} via In-Reply-To: {}", existingThread.get().getId(), inReplyTo);
                    return updateThreadWithNewMessage(existingThread.get(), snippet, timestamp, hasAttachments);
                }
            }
        }

        // 2. References header ancestor walk (reverse order: closest parent first)
        if (referencesHeader != null && !referencesHeader.isBlank()) {
            List<String> refIds = extractMessageIds(referencesHeader);
            Collections.reverse(refIds);
            for (String refId : refIds) {
                Optional<Message> ancestorMsg = messageRepository.findByMessageIdHeaderAndUserId(refId, userId);
                if (ancestorMsg.isPresent()) {
                    Optional<Thread> existingThread = threadRepository.findByIdAndUserId(ancestorMsg.get().getThreadId(), userId);
                    if (existingThread.isPresent()) {
                        log.debug("JWZ: Matched thread {} via References header: {}", existingThread.get().getId(), refId);
                        return updateThreadWithNewMessage(existingThread.get(), snippet, timestamp, hasAttachments);
                    }
                }
            }
        }

        // 3. Subject-based clustering fallback (within 14-day temporal window)
        Instant fourteenDaysAgo = timestamp.minus(Duration.ofDays(14));
        List<Thread> candidateThreads = threadRepository.findByUserIdAndSubjectNormalizedAndLastMessageAtAfterOrderByLastMessageAtDesc(
                userId, normalizedSubject, fourteenDaysAgo
        );

        if (!candidateThreads.isEmpty()) {
            Thread matchedThread = candidateThreads.get(0);
            log.debug("JWZ: Matched thread {} via normalized subject fallback: '{}'", matchedThread.getId(), normalizedSubject);
            return updateThreadWithNewMessage(matchedThread, snippet, timestamp, hasAttachments);
        }

        // 4. No matching thread found -> Create a new Thread root
        Thread newThread = Thread.builder()
                .userId(userId)
                .subject(subject != null && !subject.isBlank() ? subject : "(No Subject)")
                .subjectNormalized(normalizedSubject)
                .snippet(snippet)
                .firstMessageAt(timestamp)
                .lastMessageAt(timestamp)
                .messageCount(1)
                .hasAttachments(hasAttachments)
                .isRead(false)
                .isStarred(false)
                .priorityTier(PriorityTier.NORMAL)
                .priorityScore(0.5)
                .priorityReason("Standard incoming message")
                .build();

        Thread saved = threadRepository.save(newThread);
        log.info("JWZ: Created new thread root {} for subject: '{}'", saved.getId(), normalizedSubject);
        return saved;
    }

    private Thread updateThreadWithNewMessage(Thread thread, String snippet, Instant timestamp, boolean hasAttachments) {
        thread.setMessageCount(thread.getMessageCount() + 1);
        if (timestamp.isAfter(thread.getLastMessageAt())) {
            thread.setLastMessageAt(timestamp);
            if (snippet != null && !snippet.isBlank()) {
                thread.setSnippet(snippet);
            }
        }
        if (hasAttachments) {
            thread.setHasAttachments(true);
        }
        thread.setRead(false);
        thread.setTrash(false);
        thread.setArchived(false);
        return threadRepository.save(thread);
    }

    private List<String> extractMessageIds(String references) {
        List<String> ids = new ArrayList<>();
        String[] tokens = references.split("[\\s,]+");
        for (String t : tokens) {
            String trimmed = t.trim();
            if (!trimmed.isEmpty()) {
                ids.add(trimmed);
            }
        }
        return ids;
    }
}
