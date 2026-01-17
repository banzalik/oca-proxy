# OCA (Oracle Code Assist) API Documentation

This document describes how the Oracle Code Assist (OCA) API integration works in this codebase.

## Overview

OCA is a **LiteLLM-based proxy** that exposes an **OpenAI-compatible interface** to various backend models (GPT, Claude, Gemini, etc.). It does not use a custom agent format—it follows standard OpenAI SDK patterns with OCI-specific authentication headers.

**Key points for building a proxy/transform client:**

- Use standard OpenAI SDK or any OpenAI-compatible HTTP client
- Add OCI authentication headers (`Authorization`, `opc-request-id`, `client`, etc.)
- Models are prefixed with `oca/` (e.g., `oca/gpt-4.1`)
- Supports both `/chat/completions` and `/responses` endpoints
- Streaming via SSE (Server-Sent Events) is **required** (`stream: true`)

## Server Addresses

OCA supports two deployment modes with different base URLs:

| Mode                   | Base URL                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------- |
| **External** (default) | `https://code.aiservice.us-chicago-1.oci.oraclecloud.com/20250206/app/litellm`          |
| **Internal**           | `https://code-internal.aiservice.us-chicago-1.oci.oraclecloud.com/20250206/app/litellm` |

The mode is selected via `ocaMode` option (`"internal"` or `"external"`). Custom URLs can be provided via `ocaBaseUrl`.

## Authentication

### IDCS (Identity Cloud Service) Configuration

| Setting       | External                                     | Internal                                                                 |
| ------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| **Client ID** | `c1aba3deed5740659981a752714eba33`           | `a8331954c0cf48ba99b5dd223a14c6ea`                                       |
| **IDCS URL**  | `https://login-ext.identity.oraclecloud.com` | `https://idcs-9dc693e80d9b469480d7afe00e743931.identity.oraclecloud.com` |
| **Scopes**    | `openid offline_access`                      | `openid offline_access`                                                  |

Configuration can be overridden via `~/.oca/config.json`.

### Authentication Flow

1. Uses OAuth 2.0 with PKCE (Proof Key for Code Exchange)
2. Tokens are managed by `OcaAuthService`
3. Bearer tokens are passed via `Authorization` header

### Request Headers

All OCA requests include these headers:

```
Authorization: Bearer <access_token>
Content-Type: application/json
client: Cline
client-version: <cline_version>
client-ide: <platform>
client-ide-version: <ide_version>
opc-request-id: <32_hex_chars>
```

The `opc-request-id` format (32 hex characters):

- Bytes 0-7: SHA-256 hash of token (first 4 bytes)
- Bytes 8-15: SHA-256 hash of taskId (first 4 bytes)
- Bytes 16-23: Unix timestamp (seconds)
- Bytes 24-31: Random value

---

## API Endpoints

### 1. List Available Models

**Endpoint:** `GET /models` (or `/model/info`)

Returns an array of available models with their configurations.

**Response format:**

```json
[
  {
    "model_name": "OpenAI GPT 4.1",
    "litellm_params": {
      "model": "oca/gpt-4.1",
      "max_tokens": 1047576
    },
    "model_info": {
      "context_window": 1047576,
      "max_output_tokens": 32768,
      "description": null,
      "version": null,
      "labels": null,
      "supports_vision": true,
      "is_reasoning_model": false,
      "reasoning_effort_options": [],
      "supported_api_list": ["RESPONSES", "CHAT_COMPLETIONS"],
      "survey_id": "survey_3.01",
      "survey_content": "<html>...</html>",
      "banner": "<div>...</div>"
    }
  }
]
```

**Model List Response Fields:**

| Field                                 | Type           | Description                                                            |
| ------------------------------------- | -------------- | ---------------------------------------------------------------------- |
| `model_name`                          | `string`       | Human-readable display name                                            |
| `litellm_params.model`                | `string`       | Model ID with `oca/` prefix (used in API calls)                        |
| `litellm_params.max_tokens`           | `number`       | Maximum total tokens                                                   |
| `model_info.context_window`           | `number`       | Maximum context window size                                            |
| `model_info.max_output_tokens`        | `number`       | Maximum output/completion tokens                                       |
| `model_info.description`              | `string\|null` | Model description                                                      |
| `model_info.version`                  | `string\|null` | Model version                                                          |
| `model_info.labels`                   | `array\|null`  | Model labels/tags                                                      |
| `model_info.supports_vision`          | `boolean`      | Whether model supports image inputs                                    |
| `model_info.is_reasoning_model`       | `boolean`      | Whether model has reasoning capabilities                               |
| `model_info.reasoning_effort_options` | `string[]`     | Available reasoning effort levels (e.g., `["low", "medium", "high"]`)  |
| `model_info.supported_api_list`       | `string[]`     | Supported API formats: `"RESPONSES"`, `"CHAT_COMPLETIONS"`             |
| `model_info.survey_id`                | `string`       | Survey identifier for feedback collection                              |
| `model_info.survey_content`           | `string`       | HTML content for rendering feedback surveys                            |
| `model_info.banner`                   | `string`       | HTML content for disclaimers/acknowledgements (shown before first use) |

---

### 2. Chat Completions API

**Endpoint:** `POST /chat/completions`

OpenAI-compatible chat completions endpoint.

**Request format:**

```json
{
  "model": "oca/gpt-4.1",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "temperature": 0,
  "stream": true,
  "max_completion_tokens": 32768,
  "max_tokens": 32768,
  "stream_options": {"include_usage": true},
  "litellm_session_id": "cline-<task_id>",
  "tools": [...],
  "reasoning_effort": "low|medium|high"
}
```

**Extended Thinking (o-mini models):**

```json
{
  "thinking": {
    "type": "enabled",
    "budget_tokens": 10000
  }
}
```

**Prompt Caching:**

```json
{
  "cache_control": { "type": "ephemeral" }
}
```

Applied to system message and last two user messages.

**Stream Response Events:**

- `delta.content` - Text content
- `delta.thinking` - Reasoning/thinking content
- `delta.tool_calls` - Tool call deltas
- `chunk.usage` - Token usage (final chunk)

**Usage Response:**

```json
{
  "prompt_tokens": 1000,
  "completion_tokens": 500,
  "cache_creation_input_tokens": 100,
  "prompt_cache_miss_tokens": 100,
  "cache_read_input_tokens": 900,
  "prompt_cache_hit_tokens": 900
}
```

---

### 3. Responses API

**Endpoint:** `POST /responses`

OpenAI Responses API format (newer API style).

**Request format:**

```json
{
  "model": "oca/gpt-4.1",
  "input": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "stream": true,
  "tools": [
    {
      "type": "function",
      "name": "tool_name",
      "description": "...",
      "parameters": {...},
      "strict": true
    }
  ],
  "reasoning": {
    "effort": "low|medium|high",
    "summary": "auto"
  }
}
```

---

### 4. Cost Calculation

**Endpoint:** `POST /spend/calculate`

Calculate token costs for a given model and usage.

**Request:**

```json
{
  "completion_response": {
    "model": "oca/gpt-4.1",
    "usage": {
      "prompt_tokens": 1000000,
      "completion_tokens": 0
    }
  }
}
```

**Response:**

```json
{
  "cost": 0.003
}
```

Costs are calculated by querying for 1M input tokens and 1M output tokens separately, then computing total cost proportionally.

---

### 5. Submit Survey Event

**Endpoint:** `POST /actions/submitSurveyEvent` (or `submitSurveyEventInternal`)

Submit user feedback survey responses.

**Request:**

```json
{
  "surveyId": "survey_3.01",
  "surveyEvent": {
    "eventType": "GET|SUBMIT",
    "model": "oca/gpt-4.1",
    "payload": {
      "nps_score": 8,
      "time_saved": "2–5 hours",
      "additional_feedback": "..."
    }
  }
}
```

**Event Types:**

- `GET` - Sent when survey is first displayed (empty payload)
- `SUBMIT` - Sent when user submits survey responses

---

## Data Structures

### Handler Options

| Option                 | Type           | Description                                       |
| ---------------------- | -------------- | ------------------------------------------------- |
| `ocaBaseUrl`           | `string`       | Custom API base URL                               |
| `ocaModelId`           | `string`       | Model identifier (e.g., `oca/gpt-4.1`)            |
| `ocaModelInfo`         | `OcaModelInfo` | Model configuration object                        |
| `ocaReasoningEffort`   | `string`       | Reasoning effort level: `low`, `medium`, `high`   |
| `thinkingBudgetTokens` | `number`       | Token budget for extended thinking (0 = disabled) |
| `ocaUsePromptCache`    | `boolean`      | Enable prompt caching                             |
| `taskId`               | `string`       | Task ID for session tracking                      |
| `ocaMode`              | `string`       | `"internal"` or `"external"`                      |

### OcaModelInfo (Internal TypeScript Type)

```typescript
interface OcaModelInfo {
  // Token limits
  maxTokens: number; // maps from litellm_params.max_tokens
  contextWindow: number; // maps from model_info.context_window

  // Capabilities
  supportsImages: boolean; // maps from model_info.supports_vision
  supportsPromptCache: boolean;
  supportsReasoning: boolean; // maps from model_info.is_reasoning_model
  supportsReasoningEffort: boolean;
  reasoningEffortOptions: string[]; // maps from model_info.reasoning_effort_options

  // Pricing (per 1M tokens)
  inputPrice: number;
  outputPrice: number;
  cacheWritesPrice: number;
  cacheReadsPrice: number;

  // Model metadata
  modelName: string; // maps from model_name
  description: string; // maps from model_info.description
  temperature: number;
  thinkingConfig: ThinkingConfig;

  // API format
  apiFormat: ApiFormat; // derived from model_info.supported_api_list

  // Survey/UI content
  surveyId?: string; // maps from model_info.survey_id
  surveyContent?: string; // maps from model_info.survey_content
  banner?: string; // maps from model_info.banner
}
```

### API Format Enum

```typescript
enum ApiFormat {
  CHAT_COMPLETIONS = 'CHAT_COMPLETIONS',
  OPENAI_RESPONSES = 'RESPONSES',
}
```

---

## Error Handling

Errors include the `opc-request-id` header value for debugging:

```
<error_code>: <error_message>
(opc-request-id: <request_id>)
```

## Retry Behavior

The handler uses the `@withRetry()` decorator for automatic retry on transient failures.

---

## Key Files

| File                                       | Description                     |
| ------------------------------------------ | ------------------------------- |
| `src/core/api/providers/oca.ts`            | Main handler implementation     |
| `src/services/auth/oca/OcaAuthService.ts`  | Authentication service          |
| `src/services/auth/oca/utils/constants.ts` | URL and client constants        |
| `src/services/auth/oca/utils/utils.ts`     | Header generation, PKCE helpers |
| `src/shared/api.ts`                        | OcaModelInfo type definition    |
