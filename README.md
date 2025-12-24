# CtxOpt - Context Engineering Optimizer

> Optimize your LLM token usage with intelligent context engineering.

## Features

- **Real-time Token Analysis** - Count tokens and estimate costs on every request
- **Smart Suggestions** - AI-powered recommendations to reduce context size
- **IDE Integration** - Works with Claude Code, Cursor, Windsurf
- **MCP Server** - Native integration with Model Context Protocol
- **Dashboard** - Visualize usage, costs, and optimization opportunities

## Installation

### Quick Install (Recommended)

```bash
# Linux / macOS / WSL
curl -fsSL https://ctxopt.dev/install.sh | bash

# Windows PowerShell
irm https://ctxopt.dev/install.ps1 | iex
```

The installer will:
1. Install `@ctxopt/mcp-server` globally
2. Auto-detect and configure your IDEs (Claude Code, Cursor, Windsurf)
3. Verify the installation

### Manual Install

```bash
# npm
npm install -g @ctxopt/mcp-server

# bun
bun install -g @ctxopt/mcp-server

# Then configure your IDEs
ctxopt-mcp setup
```

## CLI Commands

```bash
ctxopt-mcp setup          # Auto-configure detected IDEs
ctxopt-mcp setup --claude # Configure Claude Code only
ctxopt-mcp setup --cursor # Configure Cursor only
ctxopt-mcp setup --hooks  # Install project hooks (CLAUDE.md)
ctxopt-mcp doctor         # Verify installation
ctxopt-mcp serve          # Start MCP server (used by IDE)
ctxopt-mcp --help         # Show help
ctxopt-mcp --version      # Show version
```

## Usage Guide

### Register Your Model (Recommended)

At the start of each session, register the model for accurate tracking:

```
mcp__ctxopt__register_model model="claude-opus-4-5-20251101"
```

Common model IDs:
- `claude-opus-4-5-20251101` - Opus 4.5
- `claude-sonnet-4-20250514` - Sonnet 4
- `claude-3-5-haiku-20241022` - Haiku 3.5

### Available MCP Tools

| Tool | Purpose | Token Savings |
|------|---------|---------------|
| `smart_file_read` | Read code with AST extraction | 50-70% |
| `auto_optimize` | Auto-detect and compress any content | 40-95% |
| `analyze_build_output` | Parse build errors | 95%+ |
| `summarize_logs` | Summarize server/test/build logs | 80-90% |
| `compress_context` | Generic content compression | 40-60% |
| `deduplicate_errors` | Group repeated errors | 80-95% |
| `session_stats` | View current session statistics | - |
| `register_model` | Register model for accurate tracking | - |

### Smart File Read Examples

```bash
# Get file structure overview
mcp__ctxopt__smart_file_read filePath="src/server.ts"

# Extract specific function
mcp__ctxopt__smart_file_read filePath="src/server.ts" target={"type":"function","name":"createServer"}

# Get skeleton (signatures only)
mcp__ctxopt__smart_file_read filePath="src/server.ts" skeleton=true
```

### Compress Build Output

After a failed build command, compress the output:

```bash
mcp__ctxopt__auto_optimize content="<paste npm/tsc/webpack output>"
```

### View Session Statistics

```bash
mcp__ctxopt__session_stats
```

## IDE Configuration

### Claude Code

After running `ctxopt-mcp setup`, your `~/.claude/settings.json` will include:

```json
{
  "mcpServers": {
    "ctxopt": {
      "command": "ctxopt-mcp",
      "args": ["serve"],
      "env": {}
    }
  }
}
```

### Cursor

Configuration is added to `~/.cursor/mcp.json` (or platform-specific location).

### Windsurf

Configuration is added to `~/.windsurf/settings.json`.

## Development Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Setup environment

```bash
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your credentials
```

### 3. Setup database

```bash
bun run db:generate
bun run db:migrate
```

### 4. Start development

```bash
bun run dev
```

## Project Structure

```
ctxopt/
├── apps/
│   └── web/                  # Next.js 16 SaaS platform
├── packages/
│   ├── mcp-server/           # MCP Server for IDE integration
│   ├── shared/               # Shared types, utils, constants
│   ├── ui/                   # React component library
│   ├── eslint-config/        # Shared ESLint configs
│   └── typescript-config/    # Shared TypeScript configs
```

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: TypeScript, Bun
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Auth**: Clerk
- **Hosting**: Vercel

## License

MIT
