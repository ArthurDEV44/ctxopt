# CtxOpt - Context Engineering Optimizer

> Optimize your LLM token usage with intelligent context engineering.

## Features

- **Real-time Token Analysis** - Count tokens and estimate costs on every request
- **Smart Suggestions** - AI-powered recommendations to reduce context size
- **IDE Integration** - Works with Claude Code, Cursor, Windsurf
- **MCP Server** - Native integration with Model Context Protocol
- **Dashboard** - Visualize usage, costs, and optimization opportunities

## Quick Start

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
│   └── web/              # Next.js 16 application
├── packages/
│   ├── shared/           # Shared types and utilities
│   ├── mcp-server/       # MCP Server package
│   └── ...
```

## Configuration

### MCP Server

Add CtxOpt to your Claude Code configuration (`~/.claude/settings.json`):

```json
{
  "mcpServers": {
    "ctxopt": {
      "command": "npx",
      "args": ["@ctxopt/mcp-server"],
      "env": {
        "CTXOPT_API_KEY": "ctx_your_key_here"
      }
    }
  }
}
```

### For Cursor/Windsurf

Configure the MCP server in your IDE settings. See documentation for details.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: TypeScript, Bun
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Auth**: Clerk
- **Hosting**: Vercel

## License

MIT
