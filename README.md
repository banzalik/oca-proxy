# OCA Proxy (TypeScript)

OpenAI-compatible proxy server for Oracle Code Assist (OCA).

This proxy handles OCI authentication via web-based OAuth flow and exposes standard OpenAI API endpoints, allowing any OpenAI-compatible tool to use OCA backend models.

## Quick Start

```bash
# Run without installing (recommended)
npx oca-proxy
```

Or install globally from npm and run:

```bash
npm install -g oca-proxy
# oca-proxy

## Git hooks

This repo uses Husky to run checks locally to keep the codebase consistent and healthy.

- Pre-commit: runs Biome autofix (`npm run check`), re-stages changes, then runs `npm run lint` to ensure no remaining issues.
- Pre-push: runs `npm run typecheck` and `npm run build` to catch type errors and build failures before pushing.

Setup:
- Hooks are installed automatically via the `prepare` script when you run `npm install`.
- If hooks are missing, run: `npx husky install`.

Skip hooks temporarily (use sparingly):
- Commit without hooks: `git commit -m "msg" --no-verify`
- Push without hooks: `git push --no-verify`
```

### From Source

```bash
cd oca-proxy
npm install
npm run build
npx ./bin/oca-proxy.js
```

On first run, the browser will automatically open for OAuth login. After authentication, the proxy is ready to use.

## Authentication

The proxy uses web-based OAuth with PKCE on whitelisted ports (8669, 8668, 8667).

- **Login:** Visit `http://localhost:8669/login` or it opens automatically on first run
- **Logout:** Visit `http://localhost:8669/logout`
- **Status:** Visit `http://localhost:8669/health`

Tokens are stored in `~/.oca/refresh_token.json`.

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

Custom mappings can be configured in `~/.config/oca/oca-proxy.config.json`:

```json
{
  "model_mapping": {
    "gpt-4": "oca/gpt-4.1",
    "claude-3-opus": "oca/openai-o3"
  }
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

PM2 is a production process manager for Node.js applications. You can run the OCA Proxy via the global binary or npx.

1. Install PM2 globally:

   ```bash
   npm install -g pm2
   ```

2. Start the proxy (choose one):

   - Global install:
     ```bash
     pm2 start oca-proxy --name oca-proxy
     ```

   - Using npx (no global install):
     ```bash
     pm2 start "npx oca-proxy" --name oca-proxy
     ```

3. Monitor and manage:
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
      // If installed globally:
      script: 'oca-proxy',
      // Or, if you prefer npx, use:
      // script: 'npx',
      // args: 'oca-proxy',
      env: {
        NODE_ENV: 'production',
        PORT: 8669,
      },
    },
  ],
};
```

Then start with `pm2 start ecosystem.config.js`.


