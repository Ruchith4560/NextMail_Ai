# NextMail AI (Next-Generation Intelligent Email Platform)

> **NextMail AI** is an intelligent, privacy-first communication platform that optimizes the entire email lifecycle — from receiving and understanding a message to acting on it, securing it, and controlling its lifecycle.

---

## 1. High-Level Architecture Overview

NextMail AI is designed as a **production-ready Spring Boot 3.3+ (Java 21) Modular Monolith** coupled with a high-performance **React 19 + TypeScript + Tailwind CSS** frontend.

```
                              ┌───────────────────────────────────┐
                              │            NextMail UI            │
                              │ React 19 + TypeScript + Tailwind  │
                              └─────────────────┬─────────────────┘
                                                │ REST / STOMP WebSocket
                                                v
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           NextMail Core (Spring Boot 3.3.4 / Java 21)                   │
│                                                                                         │
│  com.nextmail:                                                                          │
│  ├── auth         : Spring Security 6, JWT Token Rotation, Redis Revocation List       │
│  ├── mail         : Ingestion, RFC 5322 MIME Parser, Drafts, Outbound SMTP Delivery     │
│  ├── thread       : JWZ Threading Engine, Subject Normalization, Conversation State     │
│  ├── search       : Elasticsearch Query DSL, Inverted Index & Semantic Hybrid Filters   │
│  ├── ai           : LLM Gateway, Structured JSON Output, Prompt Injection Sanitization  │
│  ├── attachment   : S3/MinIO Object Storage, SHA-256 Deduplication, Magic Byte Sniffer  │
│  ├── security     : Phishing Heuristic Engine, SPF/DKIM Verifier, SafeLink Scanner      │
│  ├── notification : Real-Time WebSocket (STOMP), Priority In-App Alerts, Batching       │
│  ├── workflow     : Follow-up Radar, Commitment Extraction, Action Approvals            │
│  ├── controlled   : Encrypted Message Envelopes, Revocation API, Zero-Trust Guest View  │
│  ├── enterprise   : Multi-tenancy, Audit Logs, Retention, DLP Scanning                  │
│  └── common       : Shared Domain Primitives, Result Types, Global Exception Handler    │
└───────────────────┬───────────────────┬───────────────────┬───────────────────┬─────────┘
                    │                   │                   │                   │
                    v                   v                   v                   v
            ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
            │  PostgreSQL   │   │     Redis     │   │ Elasticsearch │   │  MinIO / S3   │
            │    Data &     │   │  Cache, Rate  │   │  Full-Text &  │   │  MIME & Files │
            │ Transactions  │   │ Limits, State │   │    Search     │   │    Storage    │
            └───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘
```

---

## 2. Technology Stack

- **Backend:** Java 21 LTS, Spring Boot 3.3.4, Spring Security 6, Spring Data JPA, Hibernate 6, Virtual Threads (Project Loom)
- **Frontend:** React 19, TypeScript, Tailwind CSS, Vite, TanStack Query v5, Zustand, Lucide Icons
- **Primary Database:** PostgreSQL 16 (Durable transactional state & relational metadata)
- **Distributed Cache & Tokens:** Redis 7 (Token revocation, distributed rate limiting, ephemeral session state)
- **Search Engine:** Elasticsearch 8.15 (Inverted full-text index & semantic hybrid retrieval)
- **Object Storage:** MinIO / AWS S3 (Raw MIME messages and encrypted attachment blobs)
- **Real-Time Layer:** Spring WebSocket with STOMP over SockJS
- **Mail Testing Gateway:** GreenMail / SubEthaSMTP (Mock SMTP/IMAP protocol testing)
- **Containerization:** Docker & Docker Compose

---

## 3. Directory Structure

```
d:/project 4/
├── backend/                  # Spring Boot 3.3+ (Java 21) Modular Monolith
│   ├── src/main/java/com/nextmail/
│   │   ├── auth/             # Identity, JWT, MFA, Spring Security
│   │   ├── mail/             # Email Ingestion, MIME Parsing, Outbound
│   │   ├── thread/           # JWZ Threading Engine
│   │   ├── search/           # Elasticsearch Integration
│   │   ├── ai/               # LLM Gateway, Structured Prompts
│   │   ├── attachment/       # S3/MinIO Attachment Lifecycle
│   │   ├── security/         # Phishing & Link Analysis
│   │   ├── notification/     # WebSockets & Alerting
│   │   ├── workflow/         # Reminders & Follow-ups
│   │   ├── controlled/       # Ephemeral Encrypted Envelopes
│   │   ├── enterprise/       # Policies & Audit Logging
│   │   └── common/           # Shared Exceptions, Models & Utils
│   ├── src/main/resources/   # application.yml, DB migrations
│   ├── src/test/java/        # JUnit 5, Mockito, Testcontainers
│   └── pom.xml               # Maven configuration
├── frontend/                 # React 19 + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/       # Reusable UI Primitives (Buttons, Dialogs, Badges)
│   │   ├── features/         # Domain Modules (mail, thread, ai, search, auth)
│   │   ├── hooks/            # Custom React Hooks
│   │   ├── store/            # Zustand State Stores
│   │   ├── services/         # API Clients & Axios/Fetch Handlers
│   │   └── types/            # TypeScript Domain Definitions
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── infrastructure/           # Docker Compose & Local Infrastructure Configs
│   ├── docker-compose.yml
│   └── env.example
└── README.md
```

---

## 4. Getting Started (Development Setup)

### Prerequisites
- **Java 21 JDK**
- **Node.js 20+** / **npm 10+**
- **Docker Desktop** (for local backing services)

### Step 1: Start Infrastructure
```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

### Step 2: Run Backend
```bash
cd backend
./mvnw spring-boot:run
```

### Step 3: Run Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 5. Development Roadmap & Engineering Principles

This repository strictly adheres to **Trunk-Based Development** with semantic conventional commits:
- `feat(<domain>)`: New functionality
- `fix(<domain>)`: Bug fixes
- `refactor(<domain>)`: Code restructuring without behavioral change
- `test(<domain>)`: Unit, integration, or E2E tests
- `chore(<domain>)`: Build, dependencies, CI/CD configuration
