package com.nextmail.search;

import com.nextmail.auth.CustomUserDetails;
import com.nextmail.common.ApiResponse;
import com.nextmail.search.dto.SearchCriteria;
import com.nextmail.search.dto.SearchPageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * REST controller for full-text search, multi-field filtering, and index management.
 */
@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public ResponseEntity<ApiResponse<SearchPageResponse>> search(
            @RequestParam(value = "q", required = false) String query,
            @RequestParam(value = "folder", required = false) String folder,
            @RequestParam(value = "sender", required = false) String sender,
            @RequestParam(value = "recipient", required = false) String recipient,
            @RequestParam(value = "hasAttachments", required = false) Boolean hasAttachments,
            @RequestParam(value = "isStarred", required = false) Boolean isStarred,
            @RequestParam(value = "isRead", required = false) Boolean isRead,
            @RequestParam(value = "startDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant startDate,
            @RequestParam(value = "endDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant endDate,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        SearchCriteria criteria = SearchCriteria.builder()
                .query(query)
                .folder(folder)
                .sender(sender)
                .recipient(recipient)
                .hasAttachments(hasAttachments)
                .isStarred(isStarred)
                .isRead(isRead)
                .startDate(startDate)
                .endDate(endDate)
                .page(page)
                .size(size)
                .build();

        SearchPageResponse response = searchService.search(userDetails.getId(), criteria);
        return ResponseEntity.ok(ApiResponse.ok("Search executed successfully", response));
    }

    @PostMapping("/reindex")
    public ResponseEntity<ApiResponse<Map<String, Object>>> triggerReindex(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        int count = searchService.reindexAllForUser(userDetails.getId());
        return ResponseEntity.ok(ApiResponse.ok(
                "Reindexing completed successfully",
                Map.of("reindexedCount", count, "status", "SUCCESS")
        ));
    }
}
