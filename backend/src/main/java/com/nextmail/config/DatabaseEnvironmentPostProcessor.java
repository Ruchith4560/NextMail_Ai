package com.nextmail.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

/**
 * Cloud and Container Database Auto-Configurator for NextMail.
 * <p>
 * Seamlessly configures data source across deployment environments:
 * 1. Automatically parses 'DATABASE_URL' (e.g. postgres://user:pass@host:5432/db)
 *    provided by Render PostgreSQL into standard JDBC properties with SSL support.
 * 2. Enforces PostgreSQL dialect and driver configuration when PostgreSQL URLs are detected.
 * 3. Gracefully provides an embedded H2 fallback (PostgreSQL compatibility mode) if neither
 *    external PostgreSQL nor custom URL is provided, preventing startup crashes.
 */
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DatabaseEnvironmentPostProcessor implements EnvironmentPostProcessor {

    private static final Logger log = LoggerFactory.getLogger(DatabaseEnvironmentPostProcessor.class);
    private static final String PROPERTY_SOURCE_NAME = "nextmailDynamicDbProperties";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        // Skip dynamic injection during test suite execution to honor @ActiveProfiles("test") and application-test.yml
        if (Arrays.asList(environment.getActiveProfiles()).contains("test")) {
            return;
        }

        String springDatasourceUrl = environment.getProperty("SPRING_DATASOURCE_URL");
        String databaseUrl = environment.getProperty("DATABASE_URL");

        Map<String, Object> props = new HashMap<>();

        if (databaseUrl != null && !databaseUrl.isBlank() && (springDatasourceUrl == null || springDatasourceUrl.isBlank())) {
            log.info("Cloud DATABASE_URL detected: configuring PostgreSQL JDBC connection parameters");
            parseAndConfigureDatabaseUrl(databaseUrl, props);
        } else if (springDatasourceUrl != null && !springDatasourceUrl.isBlank()) {
            if (springDatasourceUrl.startsWith("jdbc:postgresql:")) {
                props.put("spring.jpa.database-platform", "org.hibernate.dialect.PostgreSQLDialect");
                props.put("spring.jpa.properties.hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
                props.put("spring.datasource.driver-class-name", "org.postgresql.Driver");
            }
        } else {
            // Neither SPRING_DATASOURCE_URL nor DATABASE_URL was provided.
            // Check if spring.datasource.url is already configured in application.yml or other sources
            String resolvedUrl = environment.getProperty("spring.datasource.url");
            if (resolvedUrl == null || resolvedUrl.isBlank() || resolvedUrl.contains("localhost:5432")) {
                // If it's the unconfigured localhost default, Render/Cloud containers will fail to connect.
                // Fall back safely to in-memory H2 with PostgreSQL compatibility mode
                log.info("No external PostgreSQL configured (or defaulting to unreachable localhost). Enabling embedded H2 database (PostgreSQL compatibility mode)");
                props.put("spring.datasource.url", "jdbc:h2:mem:nextmail_db;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE");
                props.put("spring.datasource.driver-class-name", "org.h2.Driver");
                props.put("spring.datasource.username", "sa");
                props.put("spring.datasource.password", "");
                props.put("spring.jpa.database-platform", "org.hibernate.dialect.H2Dialect");
                props.put("spring.jpa.properties.hibernate.dialect", "org.hibernate.dialect.H2Dialect");
            }
        }

        if (!props.isEmpty()) {
            environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, props));
        }
    }

    private void parseAndConfigureDatabaseUrl(String rawUrl, Map<String, Object> props) {
        String cleanUrl = rawUrl.trim();
        if (cleanUrl.startsWith("jdbc:")) {
            props.put("spring.datasource.url", cleanUrl);
            props.put("spring.datasource.driver-class-name", "org.postgresql.Driver");
            props.put("spring.jpa.database-platform", "org.hibernate.dialect.PostgreSQLDialect");
            props.put("spring.jpa.properties.hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
            return;
        }

        try {
            // Normalize postgres:// to postgresql:// for java.net.URI compliance
            if (cleanUrl.startsWith("postgres://")) {
                cleanUrl = "postgresql://" + cleanUrl.substring("postgres://".length());
            }

            URI uri = new URI(cleanUrl);

            String userInfo = uri.getUserInfo();
            if (userInfo != null && !userInfo.isBlank()) {
                String[] parts = userInfo.split(":", 2);
                props.put("spring.datasource.username", URLDecoder.decode(parts[0], StandardCharsets.UTF_8));
                if (parts.length > 1) {
                    props.put("spring.datasource.password", URLDecoder.decode(parts[1], StandardCharsets.UTF_8));
                }
            }

            String host = uri.getHost();
            int port = uri.getPort() > 0 ? uri.getPort() : 5432;
            String path = uri.getPath(); // includes leading '/'
            if (path == null || path.isBlank() || path.equals("/")) {
                path = "/nextmail_db";
            }

            StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://")
                    .append(host)
                    .append(":")
                    .append(port)
                    .append(path);

            String query = uri.getQuery();
            if (query != null && !query.isBlank()) {
                jdbcUrl.append("?").append(query);
                if (!query.contains("sslmode=")) {
                    jdbcUrl.append("&sslmode=require");
                }
            } else if (!"localhost".equalsIgnoreCase(host) && !"127.0.0.1".equals(host)) {
                // Cloud PostgreSQL providers like Render require SSL connection
                jdbcUrl.append("?sslmode=require");
            }

            props.put("spring.datasource.url", jdbcUrl.toString());
            props.put("spring.datasource.driver-class-name", "org.postgresql.Driver");
            props.put("spring.jpa.database-platform", "org.hibernate.dialect.PostgreSQLDialect");
            props.put("spring.jpa.properties.hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
            log.info("Configured JDBC DataSource URL: jdbc:postgresql://{}:{}{}", host, port, path);
        } catch (Exception e) {
            log.error("Failed to parse DATABASE_URL ({}): {}. Falling back to raw URL", cleanUrl, e.getMessage());
            props.put("spring.datasource.url", cleanUrl);
        }
    }
}
