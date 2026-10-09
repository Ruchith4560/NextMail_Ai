# ==========================================
# Stage 1: Build stage with Maven and Eclipse Temurin JDK 21
# ==========================================
FROM maven:3.9.8-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Cache dependency layer
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy sources and package fat jar
COPY src ./src
RUN mvn clean package -DskipTests -B

# ==========================================
# Stage 2: Minimal runtime image with Temurin JRE 21 Alpine
# ==========================================
FROM eclipse-temurin:21-jre-alpine AS runner

# Install curl for healthcheck probe
RUN apk add --no-cache curl tzdata

# Security: run as unprivileged non-root user
RUN addgroup -S nextmail && adduser -S nextmail -G nextmail
USER nextmail:nextmail

WORKDIR /app

# Copy executable jar from builder stage
COPY --from=builder --chown=nextmail:nextmail /build/target/*.jar /app/app.jar

# Tuning JVM flags for virtual threads and container limits
ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError -Djava.security.egd=file:/dev/./urandom"
ENV SERVER_PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health/liveness || exit 1

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
