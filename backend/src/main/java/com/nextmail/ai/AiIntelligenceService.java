package com.nextmail.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nextmail.ai.dto.*;
import com.nextmail.mail.Message;
import com.nextmail.mail.MessageRepository;
import com.nextmail.thread.PriorityTier;
import com.nextmail.thread.Thread;
import com.nextmail.thread.ThreadRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Core AI intelligence service coordinating LLM inference and heuristic reasoning
 * for conversation summarization, priority scoring, action item extraction, and draft reply generation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiIntelligenceService {

    private final GeminiAiClient geminiAiClient;
    private final ThreadRepository threadRepository;
    private final MessageRepository messageRepository;
    private final ThreadSummaryRepository threadSummaryRepository;
    private final ObjectMapper objectMapper;

    private static final Pattern URGENT_PATTERN = Pattern.compile(
            "\\b(urgent|asap|deadline|p0|p1|outage|blocker|failover|immediate|emergency)\\b",
            Pattern.CASE_INSENSITIVE
    );

    private static final Pattern IMPORTANT_PATTERN = Pattern.compile(
            "\\b(important|priority|action required|review|sign-off|proposal|contract|invoice|approval)\\b",
            Pattern.CASE_INSENSITIVE
    );

    /**
     * Generates or fetches structured conversation summary for a thread.
     */
    @Transactional
    public AiSummaryResponse summarizeThread(UUID threadId, UUID userId) {
        Thread thread = threadRepository.findByIdAndUserId(threadId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Thread not found or access denied"));

        List<Message> messages = messageRepository.findByThreadIdAndUserIdOrderBySentAtAsc(threadId, userId);
        if (messages.isEmpty()) {
            throw new IllegalStateException("Cannot summarize empty thread");
        }

        // Check if existing summary is already fresh (newer than the latest message)
        Optional<ThreadSummary> existingSummaryOpt = threadSummaryRepository.findByThreadId(threadId);
        Message lastMessage = messages.get(messages.size() - 1);

        if (existingSummaryOpt.isPresent()) {
            ThreadSummary summary = existingSummaryOpt.get();
            if (summary.getGeneratedAt().isAfter(lastMessage.getSentAt())) {
                return mapToDto(summary);
            }
        }

        // Generate fresh summary via Gemini or Heuristic fallback
        AiSummaryResponse generated = generateSummaryInternal(thread, messages);

        // Update Thread entity priority fields
        thread.setPriorityTier(generated.getPriorityTier());
        thread.setPriorityScore(generated.getPriorityScore());
        thread.setPriorityReason(generated.getPriorityReason());
        threadRepository.save(thread);

        // Upsert ThreadSummary entity
        ThreadSummary summary = existingSummaryOpt.orElseGet(() -> ThreadSummary.builder()
                .threadId(threadId)
                .userId(userId)
                .build());

        try {
            summary.setOverview(generated.getOverview());
            summary.setKeyDecisionsJson(objectMapper.writeValueAsString(generated.getKeyDecisions()));
            summary.setActionItemsJson(objectMapper.writeValueAsString(generated.getActionItems()));
            summary.setUnresolvedQuestionsJson(objectMapper.writeValueAsString(generated.getUnresolvedQuestions()));
            summary.setPriorityTier(generated.getPriorityTier());
            summary.setPriorityScore(generated.getPriorityScore());
            summary.setPriorityReason(generated.getPriorityReason());
            summary.setSuggestedAction(generated.getSuggestedAction());
            summary.setModelUsed(generated.getModelUsed());
            summary.setGeneratedAt(Instant.now());

            threadSummaryRepository.save(summary);
        } catch (Exception ex) {
            log.warn("Failed to serialize thread summary JSON: {}", ex.getMessage());
        }

        return generated;
    }

    /**
     * Contextual reply generation tailored to the conversation history and selected tone.
     */
    @Transactional(readOnly = true)
    public AiReplyResponse generateDraftReply(UUID threadId, UUID userId, AiReplyRequest request) {
        Thread thread = threadRepository.findByIdAndUserId(threadId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Thread not found or access denied"));

        List<Message> messages = messageRepository.findByThreadIdAndUserIdOrderBySentAtAsc(threadId, userId);
        if (messages.isEmpty()) {
            throw new IllegalStateException("Cannot reply to empty thread");
        }

        Message lastMessage = messages.get(messages.size() - 1);
        ReplyTone tone = request.getTone() != null ? request.getTone() : ReplyTone.PROFESSIONAL;

        if (geminiAiClient.isConfigured()) {
            String systemInstruction = "You are NextMail AI Reply Assistant. Generate a contextual, well-crafted email reply draft.\n" +
                    "Requested tone: " + tone.name() + ".\n" +
                    (request.getInstructions() != null ? "User Guidance: " + request.getInstructions() + "\n" : "") +
                    "Return a JSON object with keys: suggestedReplyText (string), tone (string).";

            String userContent = buildThreadTranscript(thread, messages);
            String jsonOutput = geminiAiClient.generateStructuredJson(systemInstruction, userContent);

            if (jsonOutput != null) {
                try {
                    JsonNode node = objectMapper.readTree(jsonOutput);
                    String text = node.path("suggestedReplyText").asText();
                    if (!text.isBlank()) {
                        return AiReplyResponse.builder()
                                .suggestedReplyText(text)
                                .tone(tone)
                                .modelUsed(geminiAiClient.getModelName())
                                .build();
                    }
                } catch (Exception ex) {
                    log.warn("Failed to parse Gemini reply JSON: {}", ex.getMessage());
                }
            }
        }

        // Heuristic draft generation fallback
        return generateHeuristicReply(thread, lastMessage, tone, request.getInstructions());
    }

    private AiSummaryResponse generateSummaryInternal(Thread thread, List<Message> messages) {
        if (geminiAiClient.isConfigured()) {
            String systemInstruction = """
                    You are NextMail AI Conversation Intelligence. Analyze this email thread and output strict JSON with:
                    - overview: String (What happened, context, and current status)
                    - keyDecisions: List of Strings (Decisions made so far)
                    - actionItems: List of Objects with keys [task, assignee, dueSuggestion]
                    - unresolvedQuestions: List of Strings (Open questions or blockers)
                    - priorityTier: String (One of: URGENT, IMPORTANT, NORMAL, LOW)
                    - priorityScore: Number (0.0 to 1.0)
                    - priorityReason: String (Concise explanation for priority assignment)
                    - suggestedAction: String (Recommended next step for the reader)
                    """;

            String userContent = buildThreadTranscript(thread, messages);
            String jsonOutput = geminiAiClient.generateStructuredJson(systemInstruction, userContent);

            if (jsonOutput != null) {
                try {
                    JsonNode root = objectMapper.readTree(jsonOutput);
                    String overview = root.path("overview").asText("Conversation overview unavailable.");
                    List<String> decisions = objectMapper.convertValue(root.path("keyDecisions"), new TypeReference<>() {});
                    List<AiActionItemDTO> actions = objectMapper.convertValue(root.path("actionItems"), new TypeReference<>() {});
                    List<String> questions = objectMapper.convertValue(root.path("unresolvedQuestions"), new TypeReference<>() {});
                    String tierStr = root.path("priorityTier").asText("NORMAL");
                    double score = root.path("priorityScore").asDouble(0.5);
                    String reason = root.path("priorityReason").asText("Standard priority based on content analysis.");
                    String action = root.path("suggestedAction").asText("Review latest update and respond if necessary.");

                    PriorityTier tier;
                    try {
                        tier = PriorityTier.valueOf(tierStr.toUpperCase());
                    } catch (Exception e) {
                        tier = PriorityTier.NORMAL;
                    }

                    return AiSummaryResponse.builder()
                            .threadId(thread.getId())
                            .overview(overview)
                            .keyDecisions(decisions != null ? decisions : List.of())
                            .actionItems(actions != null ? actions : List.of())
                            .unresolvedQuestions(questions != null ? questions : List.of())
                            .priorityTier(tier)
                            .priorityScore(score)
                            .priorityReason(reason)
                            .suggestedAction(action)
                            .modelUsed(geminiAiClient.getModelName())
                            .generatedAt(Instant.now())
                            .build();
                } catch (Exception ex) {
                    log.warn("Failed to parse Gemini summary JSON, using heuristic fallback: {}", ex.getMessage());
                }
            }
        }

        return generateHeuristicSummary(thread, messages);
    }

    private AiSummaryResponse generateHeuristicSummary(Thread thread, List<Message> messages) {
        StringBuilder fullTextBuilder = new StringBuilder();
        List<String> participants = new ArrayList<>();
        List<String> questions = new ArrayList<>();

        for (Message msg : messages) {
            fullTextBuilder.append(msg.getSubject()).append(" ").append(msg.getBodyText()).append(" ");
            if (msg.getSenderName() != null && !participants.contains(msg.getSenderName())) {
                participants.add(msg.getSenderName());
            }

            // Detect sentences with question marks
            if (msg.getBodyText() != null) {
                String[] sentences = msg.getBodyText().split("[\\r\\n.]+");
                for (String s : sentences) {
                    if (s.contains("?") && questions.size() < 3) {
                        questions.add(s.trim());
                    }
                }
            }
        }

        String fullText = fullTextBuilder.toString();
        PriorityTier tier = PriorityTier.NORMAL;
        double score = 0.5;
        String reason = "Routine communication within standard response window.";

        if (URGENT_PATTERN.matcher(fullText).find()) {
            tier = PriorityTier.URGENT;
            score = 0.95;
            reason = "Detected urgent operational keywords or critical deadlines.";
        } else if (IMPORTANT_PATTERN.matcher(fullText).find() || thread.isHasAttachments()) {
            tier = PriorityTier.IMPORTANT;
            score = 0.80;
            reason = "Contains actionable business proposals, attachments, or requests for sign-off.";
        }

        Message latest = messages.get(messages.size() - 1);
        String senderName = latest.getSenderName() != null ? latest.getSenderName() : latest.getSenderEmail();

        String overview = String.format("Discussion regarding '%s' involving %s. Latest update from %s.",
                thread.getSubject(), String.join(", ", participants), senderName);

        List<String> decisions = List.of(
                "Initial alignment established across thread participants.",
                "Confirmed current status with latest message from " + senderName
        );

        List<AiActionItemDTO> actionItems = List.of(
                AiActionItemDTO.builder()
                        .task("Review latest proposal and respond to " + senderName)
                        .assignee("You")
                        .dueSuggestion(tier == PriorityTier.URGENT ? "Today, EOD" : "This week")
                        .build()
        );

        String suggestedAction = tier == PriorityTier.URGENT
                ? "Immediate reply recommended to unblock pending action."
                : "Review details and acknowledge receipt.";

        return AiSummaryResponse.builder()
                .threadId(thread.getId())
                .overview(overview)
                .keyDecisions(decisions)
                .actionItems(actionItems)
                .unresolvedQuestions(questions.isEmpty() ? List.of("Awaiting feedback on latest proposal.") : questions)
                .priorityTier(tier)
                .priorityScore(score)
                .priorityReason(reason)
                .suggestedAction(suggestedAction)
                .modelUsed("heuristic-intelligence")
                .generatedAt(Instant.now())
                .build();
    }

    private AiReplyResponse generateHeuristicReply(Thread thread, Message lastMessage, ReplyTone tone, String customInstructions) {
        String sender = lastMessage.getSenderName() != null ? lastMessage.getSenderName().split(" ")[0] : "there";
        String customNote = (customInstructions != null && !customInstructions.isBlank())
                ? "\n\nRegarding your note: " + customInstructions.trim() + "."
                : "";

        String replyText;
        switch (tone) {
            case CONCISE -> replyText = String.format("Hi %s,\n\nReceived and reviewed. Everything looks good on our end.%s\n\nThanks!", sender, customNote);
            case FRIENDLY -> replyText = String.format("Hi %s,\n\nThanks so much for following up on this! Really appreciate the thorough update.%s\n\nLooking forward to catching up soon,\nBest", sender, customNote);
            case TECHNICAL -> replyText = String.format("Hi %s,\n\nThanks for the update. I have reviewed the technical specifications and architecture notes.%s\n\nLet's coordinate on deployment metrics and telemetry verification before merging.\n\nRegards", sender, customNote);
            case FIRM -> replyText = String.format("Hi %s,\n\nThank you for the communication. We need to ensure all deliverables meet the agreed specifications before proceeding.%s\n\nPlease confirm revised timelines by EOD.\n\nRegards", sender, customNote);
            default -> replyText = String.format("Hi %s,\n\nThank you for reaching out regarding '%s'. I have reviewed the points outlined below and confirmed next steps.%s\n\nPlease let me know if any additional information is required.\n\nBest regards", sender, thread.getSubject(), customNote);
        }

        return AiReplyResponse.builder()
                .suggestedReplyText(replyText)
                .tone(tone)
                .modelUsed("heuristic-intelligence")
                .build();
    }

    private String buildThreadTranscript(Thread thread, List<Message> messages) {
        StringBuilder sb = new StringBuilder();
        sb.append("Thread Subject: ").append(thread.getSubject()).append("\n\n");
        for (int i = 0; i < messages.size(); i++) {
            Message m = messages.get(i);
            sb.append(String.format("--- Message %d of %d ---\n", i + 1, messages.size()));
            sb.append("From: ").append(m.getSenderName()).append(" <").append(m.getSenderEmail()).append(">\n");
            sb.append("Sent: ").append(m.getSentAt()).append("\n");
            sb.append("Subject: ").append(m.getSubject()).append("\n");
            sb.append("Body:\n").append(m.getBodyText()).append("\n\n");
        }
        return sb.toString();
    }

    private AiSummaryResponse mapToDto(ThreadSummary entity) {
        List<String> decisions = List.of();
        List<AiActionItemDTO> actions = List.of();
        List<String> questions = List.of();

        try {
            if (entity.getKeyDecisionsJson() != null) {
                decisions = objectMapper.readValue(entity.getKeyDecisionsJson(), new TypeReference<>() {});
            }
            if (entity.getActionItemsJson() != null) {
                actions = objectMapper.readValue(entity.getActionItemsJson(), new TypeReference<>() {});
            }
            if (entity.getUnresolvedQuestionsJson() != null) {
                questions = objectMapper.readValue(entity.getUnresolvedQuestionsJson(), new TypeReference<>() {});
            }
        } catch (Exception ex) {
            log.warn("Failed to deserialize ThreadSummary JSON fields: {}", ex.getMessage());
        }

        return AiSummaryResponse.builder()
                .threadId(entity.getThreadId())
                .overview(entity.getOverview())
                .keyDecisions(decisions)
                .actionItems(actions)
                .unresolvedQuestions(questions)
                .priorityTier(entity.getPriorityTier())
                .priorityScore(entity.getPriorityScore() != null ? entity.getPriorityScore() : 0.5)
                .priorityReason(entity.getPriorityReason())
                .suggestedAction(entity.getSuggestedAction())
                .modelUsed(entity.getModelUsed())
                .generatedAt(entity.getGeneratedAt())
                .build();
    }
}
