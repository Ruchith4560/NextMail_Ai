package com.nextmail.search;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.elasticsearch.repository.config.EnableElasticsearchRepositories;

/**
 * Configuration for Spring Data Elasticsearch, scoping repository scanning strictly
 * to the search package to prevent repository type collision with JPA entities.
 */
@Configuration
@EnableElasticsearchRepositories(basePackages = "com.nextmail.search")
public class ElasticsearchConfig {
}
