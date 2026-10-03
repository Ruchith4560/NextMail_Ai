package com.nextmail.ai;

import com.nextmail.thread.PriorityTier;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Persisted structured AI intelligence summary for an email thread.
 * Encapsulates multi-point synthesis, extracted action items, decisions, and priority rationale.
 */
@Entity
@Table(name = "thread_summaries", indexes = {
        @Index(name = "idx_thread_summaries_thread_id", columnList = "thread_id", unique = true),
        @Index(name = "idx_thread_summaries_user_id", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ThreadSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "thread_id", nullable = false, unique = true)
    private UUID threadId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String overview;

    @Column(name = "key_decisions", columnDefinition = "TEXT")
    private String keyDecisionsJson;

    @Column(name = "action_items", columnDefinition = "TEXT")
    private String actionItemsJson;

    @Column(name = "unresolved_questions", columnDefinition = "TEXT")
    private String unresolvedQuestionsJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority_tier", nullable = false, length = 32)
    @Builder.Default
    private PriorityTier priorityTier = PriorityTier.NORMAL;

    @Column(name = "priority_score")
    @Builder.Default
    private Double priorityScore = 0.5;

    @Column(name = "priority_reason", length = 500)
    private String priorityReason;

    @Column(name = "suggested_action", length = 500)
    private String suggestedAction;

    @Column(name = "model_used", length = 64)
    private String modelUsed;

    @CreationTimestamp
    @Column(name = "generated_at", nullable = false)
    private Instant generatedAt;
}
