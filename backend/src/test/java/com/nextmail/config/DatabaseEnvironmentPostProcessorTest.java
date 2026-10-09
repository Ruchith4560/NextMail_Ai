package com.nextmail.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.*;

class DatabaseEnvironmentPostProcessorTest {

    private final DatabaseEnvironmentPostProcessor processor = new DatabaseEnvironmentPostProcessor();
    private final SpringApplication application = new SpringApplication();

    @Test
    @DisplayName("Should parse Render DATABASE_URL with postgres:// scheme and configure PostgreSQL JDBC properties")
    void shouldParseRenderDatabaseUrl() {
        MockEnvironment environment = new MockEnvironment();
        environment.setProperty("DATABASE_URL", "postgres://nextmail_user:secret_pass123@dpg-abc123-a.oregon-postgres.render.com:5432/nextmail_prod");

        processor.postProcessEnvironment(environment, application);

        assertEquals("jdbc:postgresql://dpg-abc123-a.oregon-postgres.render.com:5432/nextmail_prod?sslmode=require",
                environment.getProperty("spring.datasource.url"));
        assertEquals("nextmail_user", environment.getProperty("spring.datasource.username"));
        assertEquals("secret_pass123", environment.getProperty("spring.datasource.password"));
        assertEquals("org.postgresql.Driver", environment.getProperty("spring.datasource.driver-class-name"));
        assertEquals("org.hibernate.dialect.PostgreSQLDialect", environment.getProperty("spring.jpa.database-platform"));
        assertEquals("org.hibernate.dialect.PostgreSQLDialect", environment.getProperty("spring.jpa.properties.hibernate.dialect"));
    }

    @Test
    @DisplayName("Should handle existing query parameters on DATABASE_URL and append sslmode if missing")
    void shouldHandleDatabaseUrlWithQuery() {
        MockEnvironment environment = new MockEnvironment();
        environment.setProperty("DATABASE_URL", "postgresql://user:pass@render-db.internal:5432/testdb?currentSchema=public");

        processor.postProcessEnvironment(environment, application);

        assertEquals("jdbc:postgresql://render-db.internal:5432/testdb?currentSchema=public&sslmode=require",
                environment.getProperty("spring.datasource.url"));
        assertEquals("user", environment.getProperty("spring.datasource.username"));
        assertEquals("pass", environment.getProperty("spring.datasource.password"));
    }

    @Test
    @DisplayName("Should fall back to embedded H2 when no database URL is provided")
    void shouldFallbackToEmbeddedH2() {
        MockEnvironment environment = new MockEnvironment();

        processor.postProcessEnvironment(environment, application);

        assertNotNull(environment.getProperty("spring.datasource.url"));
        assertTrue(environment.getProperty("spring.datasource.url").startsWith("jdbc:h2:mem:nextmail_db"));
        assertEquals("org.h2.Driver", environment.getProperty("spring.datasource.driver-class-name"));
        assertEquals("sa", environment.getProperty("spring.datasource.username"));
        assertEquals("org.hibernate.dialect.H2Dialect", environment.getProperty("spring.jpa.database-platform"));
    }

    @Test
    @DisplayName("Should skip post processing when test profile is active")
    void shouldSkipWhenTestProfileActive() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("test");
        environment.setProperty("DATABASE_URL", "postgres://someuser:somepass@somehost:5432/somedb");

        processor.postProcessEnvironment(environment, application);

        // When test profile is active, processor must not inject properties
        assertNull(environment.getProperty("spring.datasource.url"));
    }
}
