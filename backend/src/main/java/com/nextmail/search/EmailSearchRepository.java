package com.nextmail.search;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data Elasticsearch repository for EmailSearchDocument index.
 */
@Repository
public interface EmailSearchRepository extends ElasticsearchRepository<EmailSearchDocument, String> {

    Page<EmailSearchDocument> findByUserId(String userId, Pageable pageable);

    Page<EmailSearchDocument> findByUserIdAndFolder(String userId, String folder, Pageable pageable);

    List<EmailSearchDocument> findByThreadId(String threadId);

    void deleteByThreadId(String threadId);
}
