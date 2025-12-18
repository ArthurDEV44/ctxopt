# @ctxopt/core

Native PTY wrapper for Claude Code with automatic token optimization suggestions.

## Features

- **Cross-platform PTY management** via portable-pty (macOS, Linux, Windows)
- **Stream analysis** with pattern detection for build errors (TypeScript, Rust, ESLint, Python, Go)
- **Token estimation** using claude-tokenizer
- **Context injection** with smart suggestions for MCP tools
- **Async I/O** with Tokio runtime
- **NAPI bindings** for seamless Node.js integration

## Installation

```bash
npm install @ctxopt/core
```

## Supported Platforms

| Platform | Architecture | Package |
|----------|-------------|---------|
| macOS | x64 | @ctxopt/cli-darwin-x64 |
| macOS | arm64 | @ctxopt/cli-darwin-arm64 |
| Linux | x64 | @ctxopt/cli-linux-x64-gnu |
| Linux | arm64 | @ctxopt/cli-linux-arm64-gnu |
| Windows | x64 | @ctxopt/cli-win32-x64-msvc |
| Windows | arm64 | @ctxopt/cli-win32-arm64-msvc |

## API

### CtxOptSession

Main class for managing PTY sessions.

| Method | Description |
|--------|-------------|
| `read()` | Read PTY output with suggestions |
| `write(data)` | Write string to PTY stdin |
| `writeBytes(data)` | Write raw bytes to PTY |
| `isRunning()` | Check if process is running |
| `wait()` | Wait for exit and get code |
| `resize(rows, cols)` | Resize PTY |
| `kill()` | Terminate process |
| `stats()` | Get session statistics |

### Utils

| Function | Description |
|----------|-------------|
| `estimateTokens(text)` | Estimate token count |
| `isCodeFile(path)` | Check if file is code |
| `stripAnsi(text)` | Remove ANSI escape codes |

## Development

```bash
bun run build      # Build native module
cargo test         # Run Rust tests
node test/index.mjs # Run Node.js tests
cargo bench        # Run benchmarks
```

## License

MIT
