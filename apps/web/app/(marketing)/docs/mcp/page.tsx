import Link from "next/link";
import { CodeBlock } from "../components/CodeBlock";

const tools = [
  {
    name: "analyze_build_output",
    description:
      "Analyzes build output and filters errors intelligently. Keeps first occurrence of each error type and provides a summary.",
    reduction: "95%+",
    input: "Build output text",
    output: "Filtered errors with counts",
  },
  {
    name: "compress_context",
    description:
      "Compresses large context intelligently while preserving key information.",
    reduction: "40-60%",
    input: "Large text context",
    output: "Compressed text",
  },
  {
    name: "detect_retry_loop",
    description:
      "Detects if the same command has been run 3+ times, indicating a potential retry loop.",
    reduction: "N/A",
    input: "Command being executed",
    output: "Loop detection alert",
  },
  {
    name: "smart_file_read",
    description:
      "Reads only the relevant parts of a file using AST analysis. Ideal for large files.",
    reduction: "50-70%",
    input: "File path and query",
    output: "Relevant code sections",
  },
  {
    name: "session_stats",
    description:
      "Returns statistics for the current session including tokens used, saved, and patterns detected.",
    reduction: "N/A",
    input: "None",
    output: "Session metrics",
  },
  {
    name: "summarize_logs",
    description:
      "Summarizes large log files into key points and actionable insights.",
    reduction: "80-90%",
    input: "Log content",
    output: "Summary with key events",
  },
];

export default function McpDocPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">MCP Server</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          The CtxOpt MCP Server provides powerful context optimization tools
          directly in your IDE through the Model Context Protocol.
        </p>
      </div>

      {/* What is MCP */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">What is MCP?</h2>
        <p className="mb-4 text-muted-foreground">
          The{" "}
          <a
            href="https://modelcontextprotocol.io"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Model Context Protocol (MCP)
          </a>{" "}
          is an open standard that allows AI assistants to interact with
          external tools and data sources. The CtxOpt MCP Server exposes
          optimization tools that can dramatically reduce your token usage.
        </p>
      </section>

      {/* Installation */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Installation</h2>
        <CodeBlock
          code={`# Using npm
npm install -g @ctxopt/mcp-server

# Or run directly with npx
npx @ctxopt/mcp-server

# Or using bun
bun install -g @ctxopt/mcp-server`}
          language="bash"
        />
        <p className="mt-4 text-muted-foreground">
          Alternatively, use the install script which also configures your IDE:
        </p>
        <CodeBlock
          code={`curl -fsSL https://ctxopt.dev/install.sh | bash`}
          language="bash"
        />
      </section>

      {/* Configuration */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Configuration</h2>

        <h3 className="mb-4 text-lg font-semibold">Claude Code</h3>
        <p className="mb-4 text-muted-foreground">
          Add to{" "}
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

        <h3 className="mb-4 mt-8 text-lg font-semibold">With API Key (Optional)</h3>
        <p className="mb-4 text-muted-foreground">
          To sync session stats to the CtxOpt dashboard, add your API key:
        </p>
        <CodeBlock
          code={`{
  "mcpServers": {
    "ctxopt": {
      "command": "npx",
      "args": ["@ctxopt/mcp-server"],
      "env": {
        "CTXOPT_API_KEY": "ctx_your_api_key"
      }
    }
  }
}`}
          language="json"
        />

        <h3 className="mb-4 mt-8 text-lg font-semibold">Cursor</h3>
        <p className="mb-4 text-muted-foreground">
          Add to{" "}
          <code className="rounded bg-muted px-1">~/.cursor/mcp.json</code>:
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
      </section>

      {/* Available Tools */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Available Tools</h2>
        <p className="mb-6 text-muted-foreground">
          The MCP server exposes the following optimization tools:
        </p>

        <div className="space-y-4">
          {tools.map((tool) => (
            <div key={tool.name} className="rounded-lg border p-6">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">
                  <code className="rounded bg-primary/10 px-2 py-1 text-primary">
                    {tool.name}
                  </code>
                </h3>
                {tool.reduction !== "N/A" && (
                  <span className="rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-600">
                    {tool.reduction} reduction
                  </span>
                )}
              </div>
              <p className="mb-4 text-muted-foreground">{tool.description}</p>
              <div className="flex gap-8 text-sm">
                <div>
                  <span className="font-medium">Input:</span>{" "}
                  <span className="text-muted-foreground">{tool.input}</span>
                </div>
                <div>
                  <span className="font-medium">Output:</span>{" "}
                  <span className="text-muted-foreground">{tool.output}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Usage Example */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Usage Example</h2>
        <p className="mb-4 text-muted-foreground">
          Here&apos;s how the build output analyzer works in practice:
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
              BEFORE (50,000 tokens)
            </h3>
            <div className="rounded-lg border bg-muted/30 p-4">
              <pre className="text-sm text-muted-foreground">
                {`src/a.ts:12 - error TS2304: Cannot find name 'foo'
src/a.ts:15 - error TS2304: Cannot find name 'foo'
src/a.ts:18 - error TS2304: Cannot find name 'foo'
... (147 more similar errors)
src/b.ts:8 - error TS2339: Property 'bar' does not exist
... (90 more similar errors)`}
              </pre>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
              AFTER (500 tokens)
            </h3>
            <div className="rounded-lg border bg-green-500/5 p-4">
              <pre className="text-sm">
                {`147 TypeScript errors found (3 unique types):

• TS2304: Cannot find name 'foo'
  First: src/a.ts:12
  Occurrences: 45

• TS2339: Property 'bar' does not exist
  First: src/b.ts:8
  Occurrences: 90

• TS7006: Parameter implicitly has 'any' type
  First: src/c.ts:3
  Occurrences: 12`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Token Savings */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Expected Token Savings</h2>
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Technique</th>
                <th className="px-4 py-3 text-left font-medium">Reduction</th>
                <th className="px-4 py-3 text-left font-medium">Use Case</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-3">Build Output Filtering</td>
                <td className="px-4 py-3 text-green-600 font-medium">95%+</td>
                <td className="px-4 py-3 text-muted-foreground">
                  Large build errors
                </td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3">Log Summarization</td>
                <td className="px-4 py-3 text-green-600 font-medium">80-90%</td>
                <td className="px-4 py-3 text-muted-foreground">
                  Verbose log files
                </td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3">Smart File Read</td>
                <td className="px-4 py-3 text-green-600 font-medium">50-70%</td>
                <td className="px-4 py-3 text-muted-foreground">
                  Large source files
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">Context Compression</td>
                <td className="px-4 py-3 text-green-600 font-medium">40-60%</td>
                <td className="px-4 py-3 text-muted-foreground">
                  Large text contexts
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Verification */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Verification</h2>
        <p className="mb-4 text-muted-foreground">
          To verify the MCP server is working:
        </p>
        <CodeBlock
          code={`# Check if it's running
ctxopt-mcp --version

# Or run directly
npx @ctxopt/mcp-server --help`}
          language="bash"
        />
        <p className="mt-4 text-muted-foreground">
          In your IDE, the CtxOpt tools should appear in the MCP tools list.
          Try using <code className="rounded bg-muted px-1">session_stats</code>{" "}
          to see your current session metrics.
        </p>
      </section>

      {/* Troubleshooting */}
      <section className="rounded-lg border bg-muted/30 p-6">
        <h2 className="mb-4 text-lg font-semibold">Having Issues?</h2>
        <p className="text-muted-foreground">
          If the MCP server isn&apos;t working correctly, check the{" "}
          <Link
            href="/docs/troubleshooting"
            className="text-primary hover:underline"
          >
            troubleshooting guide
          </Link>{" "}
          for common solutions.
        </p>
      </section>
    </div>
  );
}
