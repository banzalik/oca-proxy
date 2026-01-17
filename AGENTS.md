# AGENTS.md — OCA Proxy Repository Guide

Purpose
- Reference for agentic coding tools and contributors in this repo
- Covers build/lint/typecheck/test, style, and repo conventions

Repository Layout
- src/index.ts — Express server and API endpoints
- src/auth.ts — PKCE OAuth, TokenManager, OCA headers
- src/config.ts — Config, paths, persistence
- src/dashboard.ts — Web dashboard routes
- src/logger.ts — Colored logging utilities
- dist/ — Build output (esbuild bundle)

Node/TypeScript
- TypeScript strict mode enabled (tsconfig.json: strict=true)
- Module: commonjs; Target: es2022; OutDir: dist
- esModuleInterop enabled (default imports for CJS modules allowed)

Install
- npm install

Run/Dev/Build
- Dev (TS runtime): npm run dev
- Build (bundle -> dist/index.js): npm run build
- Start (from dist): npm start

Type Safety
- Type-check only: npm run typecheck

Formatting/Linting (Biome)
- Format (write): npm run format
- Lint (no writes): npm run lint
- Biome full check+write: npm run check
- Always run: npm run typecheck && npm run lint before sending changes

Testing
- No test framework is currently configured in package.json
- Until tests exist, use manual smoke checks:
  - Health: curl -s http://localhost:8669/health
  - OpenAI models (requires auth): curl -s http://localhost:8669/v1/models
  - Chat (stream): curl -s http://localhost:8669/v1/chat/completions -H 'Content-Type: application/json' -d '{"model":"oca/gpt-4.1","messages":[{"role":"user","content":"hi"}],"stream":true}'
- Recommended testing setup (when adding tests):
  - Use Vitest for unit/integration tests
  - Add scripts:
    - "test": "vitest",
    - "test:run": "vitest run",
    - "test:ci": "vitest run --reporter=junit --coverage"
  - Run a single test file: npx vitest run path/to/file.test.ts
  - Run a single test name: npx vitest -t "exact test name"
  - Keep tests isolated from network; mock axios where possible

Process Checklist (agents)
- Keep changes minimal and aligned with conventions below
- After edits: npm run typecheck && npm run lint
- For runtime changes: npm run dev to verify endpoints
- For release build parity: npm run build and run node dist/index.js

Imports and Module Structure
- Order imports:
  1) Node core: fs, path, os, crypto
  2) Third-party: express, axios, uuid
  3) Internal: ./auth, ./config, ./logger, ./dashboard
- Use named imports from express: import express, { Request, Response } from "express"
- Prefer explicit imports; avoid wildcard except Node core namespace (e.g., import * as fs)
- Avoid default exports; prefer named exports for functions and constants

File/Identifier Naming
- Files: lower-kebab or lower camel within src (current repo uses lower). Keep .ts extension
- Variables/functions: camelCase
- Classes/types/interfaces: PascalCase
- Constants: UPPER_SNAKE_CASE
- HTTP path constants may stay inline if used once

Types
- Avoid any; use unknown at boundaries then narrow
- Prefer interface for object shapes; type for unions/aliases
- Always type function params/returns in exported APIs
- Catch blocks: use unknown and narrow; this repo currently uses any in catch for axios compatibility

Error Handling
- HTTP routes should catch and map errors to status codes
- Do not leak tokens or secrets in logs or responses
- For axios errors, prefer status from error.response?.status, default 500
- Example patterns:
  - OpenAI chat errors: src/index.ts:369
  - Auth errors: src/index.ts:164, src/index.ts:207
  - Config save errors: src/index.ts:283–286

Logging
- Use logger utilities instead of console.log
- Logger API: src/logger.ts:45
  - log.info, log.success, log.warn, log.error, log.debug
  - HTTP helpers: log.request (src/logger.ts:65), log.response (src/logger.ts:79)
  - Domain tags: log.auth, log.openai, log.anthropic
- Avoid logging PII/secrets; never log tokens or raw Authorization headers

Configuration and Secrets
- User config files: src/config.ts:6–8,56–70
  - ~/.config/oca/oca-proxy.config.json (preferred)
  - ~/.oca/oca-proxy-config.json (legacy read)
- Token storage path and mode: TOKEN_FILE with 0600, src/config.ts:32,96–107
- Never commit user config or tokens
- PORT is constrained to whitelisted ports; default 8669 (src/config.ts:30–35)

Authentication and Tokens
- TokenManager handles refresh/caching with a refresh lock (src/auth.ts:135–148,168–196)
- Use tokenMgr.getToken() for outbound calls (auto-refresh) (src/auth.ts:168–196)
- Save new refresh_token on rotation (src/auth.ts:218–226)
- Build OCA headers via createOcaHeaders(token) (src/auth.ts:253–259)

HTTP Client and Streaming
- Use axios for outbound HTTP
- Streaming requests must set responseType: "stream"
- For SSE proxies, set headers:
  - Content-Type: text/event-stream
  - Cache-Control: no-cache
  - Connection: keep-alive
- Patterns:
  - Chat streaming: src/index.ts:354–365
  - Responses API streaming: src/index.ts:443–453
  - Anthropic bridge streaming: src/index.ts:807–822, 813–817

API Design Conventions
- Support OpenAI-compatible endpoints under /v1
- Map non-oca models via resolveModelMapping (src/index.ts:38–63)
- Provide structured error JSON: { error: { message, code?, status? } }
- Log request start/finish; include durations (middleware src/index.ts:13–24)

Anthropic Compatibility
- Convert Anthropic Messages API to OpenAI format with anthropicToOpenAI (src/index.ts:529–639)
- Stream adapter yields Anthropic-style SSE events (src/index.ts:644–788)
- Default mapping for Anthropic model names uses resolveModelMapping (src/index.ts:589–603)

Dashboard
- Registered by registerDashboard(app, tokenMgr) (src/index.ts:32 and src/dashboard.ts:5)
- Includes model list, mapping editor, and config endpoints
- Config endpoints: GET/POST /api/config (src/index.ts:253–287)

Adding/Modifying Endpoints
- Add route in src/index.ts; follow existing logging and error shape
- Retrieve token early: const token = await tokenMgr.getToken()
- Build headers via createOcaHeaders(token)
- For streaming, set SSE headers and pipe(response.data)
- Always map models through resolveModelMapping if model is accepted from clients

Build Output and PM2
- Bundle target: dist/index.js (CommonJS)
- PM2 example config present (ecosystem.config.js)
- For PM2: npm run build then pm2 start dist/index.js --name oca-proxy

Performance/Resilience
- Token refresh lock prevents thundering herds (src/auth.ts:139–146,182–196)
- Avoid blocking the event loop in request handlers
- Keep per-request heap allocations minimal; reuse objects where safe

Security
- Do not echo inbound Authorization headers
- Do not write tokens to stdout or errors
- Ensure TOKEN_FILE permissions remain restrictive
- Validate inputs minimally; trust boundary is upstream client

Cursor/Copilot Rules
- No Cursor rules found (.cursor/ or .cursorrules)
- No Copilot instruction file found (.github/copilot-instructions.md)
- If added later, update this section with explicit inclusions

Single-Test How-To (once tests exist)
- Run one file: npx vitest run src/path/to/foo.test.ts
- Run by name: npx vitest -t "exact test name"
- Focus mode in watch: npx vitest --watch src/path/to/foo.test.ts -t "name"

Pre-PR Checklist (agents)
- npm run typecheck
- npm run lint
- npm run build
- Smoke test endpoints locally
- Update README.md if endpoints or config paths change
- Never commit secrets, tokens, or user config files
