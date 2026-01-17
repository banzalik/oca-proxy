# OCA Proxy (TypeScript)

OpenAI-compatible proxy server for Oracle Code Assist (OCA).

This proxy handles OCI authentication via web-based OAuth flow and exposes standard OpenAI API endpoints, allowing any OpenAI-compatible tool to use OCA backend models.

## Quick Start

```bash
cd oca-proxy
npm install
npm run build
npx ./bin/oca-proxy.js
```

Or install globally and run from anywhere:

```bash
npm install -g .
oca-proxy
```

You can also use npx after local or global install:

```bash
npx oca-proxy
```

On first run, the browser will automatically open for OAuth login. After authentication, the proxy is ready to use.

## Authentication

The proxy uses web-based OAuth with PKCE on whitelisted ports (8669, 8668, 8667).

- **Login:** Visit `http://localhost:8669/login` or it opens automatically on first run
- **Logout:** Visit `http://localhost:8669/logout`
- **Status:** Visit `http://localhost:8669/health`

Tokens are stored in `~/.oca/refresh_token.json` (same location as Python proxy).

## Usage with OpenAI SDK

```python
from openai import OpenAI

client = OpenAI(
    api_key="dummy",  # Not used, but required by SDK
    base_url="http://localhost:8669/v1"
)

response = client.chat.completions.create(
    model="oca/gpt-4.1",
    messages=[{"role": "user", "content": "Hello!"}],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.content, end="")
```

## Usage with curl

```bash
curl http://localhost:8669/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "oca/gpt-4.1",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

## Environment Variables

| Variable | Default | Description                                               |
| -------- | ------- | --------------------------------------------------------- |
| `PORT`   | `8669`  | Proxy server port (must be 8669, 8668, or 8667 for OAuth) |

## Supported Endpoints

### OpenAI Format (`/v1/...`)

| Endpoint               | Method | Description                            |
| ---------------------- | ------ | -------------------------------------- |
| `/v1/models`           | GET    | List available models                  |
| `/v1/chat/completions` | POST   | Chat completions (streaming supported) |
| `/v1/responses`        | POST   | Responses API (streaming supported)    |
| `/v1/completions`      | POST   | Legacy completions                     |
| `/v1/embeddings`       | POST   | Text embeddings                        |

### Anthropic Format (`/v1/messages`)

| Endpoint       | Method | Description                                  |
| -------------- | ------ | -------------------------------------------- |
| `/v1/messages` | POST   | Anthropic Messages API (streaming supported) |

### Other

| Endpoint  | Method | Description                     |
| --------- | ------ | ------------------------------- |
| `/`       | GET    | Dashboard with status and links |
| `/login`  | GET    | Start OAuth login flow          |
| `/logout` | GET    | Clear authentication            |
| `/health` | GET    | Health check                    |

## Model Mapping

Models not starting with `oca/` are automatically mapped to `oca/gpt-4.1` by default.

Custom mappings can be configured in `~/.config/oca/oca-proxy.config.json` (old path `~/.oca/oca-proxy-config.json` still read):

```json
{
  "model_mapping": {
    "gpt-4": "oca/gpt-4.1",
    "claude-3-opus": "oca/openai-o3"
  }
}
```

## Integration Examples

### Claude Code

Use the Anthropic endpoint with Claude Code:

```bash
export ANTHROPIC_API_KEY=dummy
export ANTHROPIC_BASE_URL=http://localhost:8669
claude
```

Or use environment variables in one line:

```bash
ANTHROPIC_API_KEY=dummy ANTHROPIC_BASE_URL=http://localhost:8669 claude
```

### OpenCode

Create `opencode.json` in your project root:

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
          "id": "oca/gpt-4.1",
          "name": "OCA GPT 4.1"
        }
      }
    }
  },
  "model": "oca/gpt-4.1"
}
```

### Aider

```bash
aider --openai-api-key dummy --openai-api-base http://localhost:8669/v1
```

### Continue (VS Code)

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

## Files

```
oca-proxy/
├── bin/
│   └── oca-proxy.js   # Standalone CLI - single build output
├── src/
│   ├── index.ts       # Main proxy server with OAuth endpoints
│   ├── auth.ts        # PKCE auth, token manager, OCA headers
│   ├── config.ts      # Configuration and token storage
│   └── logger.ts      # Logging utility
├── package.json
├── tsconfig.json
└── README.md
```

## Running with PM2

PM2 is a production process manager for Node.js applications. To run the OCA Proxy with PM2:

1. Install PM2 globally:

   ```bash
   npm install -g pm2
   ```

2. Build the project:

   ```bash
   npm run build
   ```

3. Start the proxy:

   ```bash
   pm2 start dist/oca-proxy.js --name oca-proxy
   ```

4. Monitor and manage:
   - View status: `pm2 status`
   - View logs: `pm2 logs oca-proxy`
   - Restart: `pm2 restart oca-proxy`
   - Stop: `pm2 stop oca-proxy`
   - Delete: `pm2 delete oca-proxy`

For advanced configuration, create `ecosystem.config.js`:

```js
module.exports = {
  apps: [
    {
      name: 'oca-proxy',
      script: 'bin/oca-proxy.js',
      env: {
        NODE_ENV: 'production',
        PORT: 8669,
      },
    },
  ],
};
```

Then start with `pm2 start ecosystem.config.js`.

## Comparison with Python Proxy

This TypeScript proxy is functionally equivalent to the Python proxy at `~/project/ccr-oca/oca-proxy/`. Both:

- Use the same OAuth client (internal mode)
- Store tokens in the same location (`~/.oca/refresh_token.json`)
- Support the same whitelisted ports (8669, 8668, 8667)
- Provide OpenAI-compatible endpoints
