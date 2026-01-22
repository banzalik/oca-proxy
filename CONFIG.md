# Configuration Examples

## Table of Contents

- [Zed](#zed)
- [Claude Code Router](#claude-code-router)
- [OpenCode](#opencode)
- [Claude Code](#claude-code)
- [Aider](#aider)
- [Continue (VS Code)](#continue-vs-code)

## Zed

Zed (https://zed.dev/) is a code editor with AI features. To configure Zed for this project, add the following to your `~/.config/zed/settings.json`:

```json
{
  "agent": {
    "always_allow_tool_actions": false,
    "default_model": {
      "provider": "Oracle Code Assist",
      "model": "oca/grok-code-fast-1",
    },
    "play_sound_when_agent_done": true,
    "model_parameters": [],
  },
  "language_models": {
    "openai_compatible": {
      "Oracle Code Assist": {
        "api_url": "http://localhost:8669/v1",
        "api_key": "OCA_TOKEN",
        "api_headers": {
          "client": "Zed",
          "client-version": "1.0.0",
        },
        "available_models": [
          {
            "name": "oca/gpt-oss-120b",
            "display_name": "OpenAI GPT OSS 120b hosted by Oracle Code Assist",
            "max_tokens": 128000,
            "capabilities": {
              "tools": true,
              "images": false,
              "parallel_tool_calls": false,
              "prompt_cache_key": false,
            },
          },
          {
            "name": "oca/llama4",
            "display_name": "Llama4 hosted by Oracle Code Assist",
            "max_tokens": 128000,
            "capabilities": {
              "tools": true,
              "images": false,
              "parallel_tool_calls": false,
              "prompt_cache_key": false,
            },
          },
          {
            "name": "oca/gpt-4.1",
            "display_name": "OpenAI GPT 4.1",
            "max_tokens": 1047576,
            "capabilities": {
              "tools": true,
              "images": true,
              "parallel_tool_calls": false,
              "prompt_cache_key": false,
            },
          },
          {
            "name": "oca/openai-o3",
            "display_name": "OpenAI O3",
            "max_tokens": 200000,
            "capabilities": {
              "tools": true,
              "images": false,
              "parallel_tool_calls": false,
              "prompt_cache_key": false,
            },
          },
          {
            "name": "oca/grok3",
            "display_name": "Grok 3",
            "max_tokens": 131072,
            "capabilities": {
              "tools": true,
              "images": false,
              "parallel_tool_calls": false,
              "prompt_cache_key": false,
            },
          },
          {
            "name": "oca/grok4",
            "display_name": "Grok 4",
            "max_tokens": 128000,
            "capabilities": {
              "tools": true,
              "images": true,
              "parallel_tool_calls": false,
              "prompt_cache_key": false,
            },
          },
          {
            "name": "oca/grok4-fast-reasoning",
            "display_name": "Grok 4 Fast Reasoning",
            "max_tokens": 2000000,
            "capabilities": {
              "tools": true,
              "images": false,
              "parallel_tool_calls": false,
              "prompt_cache_key": false,
            },
          },
          {
            "name": "oca/grok-code-fast-1",
            "display_name": "Grok Code Fast 1",
            "max_tokens": 256000,
            "capabilities": {
              "tools": true,
              "images": false,
              "parallel_tool_calls": false,
              "prompt_cache_key": false,
            },
          },
          {
            "name": "oca/gpt5",
            "display_name": "OpenAI GPT 5",
            "max_tokens": 400000,
            "capabilities": {
              "tools": true,
              "images": true,
              "parallel_tool_calls": false,
              "prompt_cache_key": false,
            },
          },
        ],
      },
    },
  },
}
```

## Claude Code Router

Claude Code Router (https://musistudio.github.io/claude-code-router/) is a tool for interacting with Claude via command line. To configure it for this project, use the following example configuration (save as `.claude-code-router/config.json` or similar):

```json
{
  "Providers": [
    {
      "name": "oca-proxy",
      "api_base_url": "http://localhost:8669/v1/messages",
      "api_key": "not-needed",
      "models": [
        "oca/llama4",
        "oca/grok4-fast-reasoning",
        "oca/grok-code-fast-1",
        "oca/gpt-4.1",
        "oca/grok3",
        "oca/openai-o3",
        "oca/gpt5",
        "oca/gpt-oss-120b",
        "oca/grok4"
      ],
      "headers": {},
      "transformer": {
        "use": ["Anthropic"]
      }
    }
  ],
  "Router": {
    "default": "oca-proxy,oca/grok4-fast-reasoning",
    "background": "oca-proxy,oca/gpt-4.1",
    "think": "oca-proxy,oca/gpt-4.1",
    "longContext": "oca-proxy,oca/gpt-4.1",
    "longContextThreshold": 60000,
    "webSearch": "oca-proxy,oca/gpt-4.1",
    "image": "oca-proxy,oca/gpt-4.1"
  },
}
```

## OpenCode

OpenCode (https://opencode.ai/) is a tool for AI-assisted coding. To configure it for this project, use the following example configuration (save as `.opencode/config.json` or similar):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "oca": {
      "api": "openai",
      "name": "Oracle Code Assist",
      "options": {
        "baseURL": "http://localhost:8669/v1",
        "apiKey": "dummy"
      },
      "models": {
        "gpt-4.1": {
          "id": "oca/gpt-4",
          "name": "OCA GPT 4.1"
        },
        "gpt-5": {
          "id": "oca/gpt5",
          "name": "OCA GPT 5"
        },
        "gpt-oss-120b": {
          "id": "oca/gpt-oss-120b",
          "name": "OCA OpenAI GPT OSS 120b"
        },
        "llama4": {
          "id": "oca/llama4",
          "name": "OCALlama4"
        },
        "openai-o3": {
          "id": "oca/openai-o3",
          "name": "OCA OpenAI O3"
        },
        "grok3": {
          "id": "oca/grok3",
          "name": "OCA Grok 3"
        },
        "grok4": {
          "id": "oca/grok4",
          "name": "OCA Grok 4"
        },
        "grok4-fast-reasoning": {
          "id": "oca/grok4-fast-reasoning",
          "name": "OCA Grok 4 Fast Reasoning"
        },
        "grok-code-fast-1": {
          "id": "oca/grok-code-fast-1",
          "name": "OCA Grok Code Fast 1"
        }
      }
    }
  },
  "model": "oca/gpt-5"
}
```

## Claude Code

Claude Code (https://code.claude.com/docs/en/overview) is a command-line tool for interacting with Claude. To set it up for this project, run the following command:

```bash
ANTHROPIC_API_KEY=dummy ANTHROPIC_BASE_URL=http://localhost:8669 claude
```

## Aider

Aider (https://aider.chat/) quick setup:

```bash
aider --openai-api-key dummy --openai-api-base http://localhost:8669/v1
```

## Continue (VS Code)

Continue (https://github.com/continuedev/continue) model configuration:

```json
{
  "models": [
    {
      "provider": "openai",
      "model": "oca/gpt-4.1",
      "apiKey": "dummy",
      "apiBase": "http://localhost:8669/v1"
    }
  ]
}
```
