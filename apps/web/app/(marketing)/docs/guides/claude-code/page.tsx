import Link from "next/link";
import { CodeBlock } from "../../components/CodeBlock";

export default function ClaudeCodeGuidePage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <div className="mb-4">
          <Link
            href="/docs/guides"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; All Guides
          </Link>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Claude Code</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Integrate CtxOpt with Claude Code CLI for optimized token usage in
          your terminal.
        </p>
      </div>

      {/* Prerequisites */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Prerequisites</h2>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Claude Code installed (
            <code className="rounded bg-muted px-1">
              npm i -g @anthropic-ai/claude-code
            </code>
            )
          </li>
          <li className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            A CtxOpt account with an API key
          </li>
        </ul>
      </section>

      {/* Configuration Options */}
      <section>
        <h2 className="mb-6 text-2xl font-semibold">Configuration</h2>
        <p className="mb-6 text-muted-foreground">
          There are two ways to configure Claude Code to use CtxOpt:
        </p>

        {/* Option 1: Environment Variables */}
        <div className="mb-8 rounded-lg border p-6">
          <h3 className="mb-4 text-lg font-semibold">
            Option 1: Environment Variables (Recommended)
          </h3>
          <p className="mb-4 text-muted-foreground">
            Add these to your shell configuration (
            <code className="rounded bg-muted px-1">~/.bashrc</code>,{" "}
            <code className="rounded bg-muted px-1">~/.zshrc</code>, etc.):
          </p>
          <CodeBlock
            code={`export ANTHROPIC_API_KEY="ctx_your_api_key"
export ANTHROPIC_BASE_URL="https://api.ctxopt.com/v1"`}
            language="bash"
          />
          <p className="mt-4 text-sm text-muted-foreground">
            After adding, reload your shell or run{" "}
            <code className="rounded bg-muted px-1">source ~/.zshrc</code>.
          </p>
        </div>

        {/* Option 2: Config File */}
        <div className="rounded-lg border p-6">
          <h3 className="mb-4 text-lg font-semibold">
            Option 2: Configuration File
          </h3>
          <p className="mb-4 text-muted-foreground">
            Create or modify{" "}
            <code className="rounded bg-muted px-1">~/.claude.json</code>:
          </p>
          <CodeBlock
            code={`{
  "apiKey": "ctx_your_api_key",
  "baseUrl": "https://api.ctxopt.com/v1"
}`}
            language="json"
          />
        </div>
      </section>

      {/* Using MCP Server */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">
          Using the MCP Server (Optional)
        </h2>
        <p className="mb-4 text-muted-foreground">
          For advanced features like build output analysis and context
          compression, install the CtxOpt MCP server:
        </p>
        <CodeBlock
          code={`npm install -g @ctxopt/mcp-server`}
          language="bash"
        />
        <p className="mt-4 mb-4 text-muted-foreground">
          Then add it to your MCP configuration at{" "}
          <code className="rounded bg-muted px-1">~/.claude/mcp.json</code>:
        </p>
        <CodeBlock
          code={`{
  "mcpServers": {
    "ctxopt": {
      "command": "npx",
      "args": ["@ctxopt/mcp-server"]
    }
  }
}`}
          language="json"
        />
        <p className="mt-4 text-muted-foreground">
          See the{" "}
          <Link href="/docs/mcp" className="text-primary hover:underline">
            MCP Server documentation
          </Link>{" "}
          for available tools and features.
        </p>
      </section>

      {/* Verification */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Verification</h2>
        <p className="mb-4 text-muted-foreground">
          Verify your setup by running:
        </p>
        <CodeBlock
          code={`# Check version
claude --version

# Test with a simple prompt
claude "Hello, Claude!"`}
          language="bash"
        />
        <p className="mt-4 text-muted-foreground">
          If configured correctly, your requests will be proxied through CtxOpt
          and you&apos;ll see usage metrics in your{" "}
          <Link href="/dashboard" className="text-primary hover:underline">
            dashboard
          </Link>
          .
        </p>
      </section>

      {/* Troubleshooting */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Troubleshooting</h2>
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">API key not working</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>- Verify the key starts with <code className="rounded bg-muted px-1">ctx_</code></li>
              <li>- Check for trailing spaces when copying</li>
              <li>- Ensure the key is active in your dashboard</li>
            </ul>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">Connection errors</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>- Check your internet connection</li>
              <li>
                - Verify the base URL is exactly{" "}
                <code className="rounded bg-muted px-1">
                  https://api.ctxopt.com/v1
                </code>
              </li>
              <li>- Try running with debug mode: <code className="rounded bg-muted px-1">claude --debug</code></li>
            </ul>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">Environment variables not loaded</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>- Restart your terminal after editing shell config</li>
              <li>- Verify with <code className="rounded bg-muted px-1">echo $ANTHROPIC_BASE_URL</code></li>
            </ul>
          </div>
        </div>
        <p className="mt-6 text-muted-foreground">
          Still having issues? Check the{" "}
          <Link
            href="/docs/troubleshooting"
            className="text-primary hover:underline"
          >
            troubleshooting guide
          </Link>{" "}
          for more help.
        </p>
      </section>
    </div>
  );
}
