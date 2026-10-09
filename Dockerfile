# ==============================================================================
# NextMail AI Unified Production Dockerfile (All-In-One Enterprise Artifact)
# ==============================================================================
# Multi-stage build compiling React 19 frontend bundle and Spring Boot 3.3.4
# fat JAR into an optimized, secure Eclipse Temurin JRE 21 Alpine container.
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build React 19 + TypeScript Frontend
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

# Cache npm dependencies layer
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy frontend source and compile production bundle
COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Build Spring Boot 3.3.4 Backend (Embedding Frontend Assets)
# ------------------------------------------------------------------------------
FROM maven:3.9.8-eclipse-temurin-21-alpine AS backend-builder

WORKDIR /build/backend

# Cache Maven dependencies layer
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B

# Copy backend source
COPY backend/src ./src

# Copy compiled frontend assets into Spring Boot's classpath static directory
COPY --from=frontend-builder /build/frontend/dist ./src/main/resources/static

# Package executable fat JAR
RUN mvn clean package -DskipTests -B

# ------------------------------------------------------------------------------
# Stage 3: Minimal Runtime Container with Temurin JRE 21 Alpine
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-alpine AS runner

# Install curl and tzdata for healthcheck and timezone support
RUN apk add --no-cache curl tzdata

# Security: Create and run under unprivileged non-root user
RUN addgroup -S nextmail && adduser -S nextmail -G nextmail
USER nextmail:nextmail

WORKDIR /app

# Copy executable fat JAR from backend builder stage
COPY --from=backend-builder --chown=nextmail:nextmail /build/backend/target/*.jar /app/app.jar

# JVM Performance Tuning for Project Loom Virtual Threads & Container Memory
ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"
ENV SERVER_PORT=8080

EXPOSE 8080

# Native container healthcheck probe
HEALTHCHECK --interval=15s --timeout=5s --start-period=35s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health/liveness || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
