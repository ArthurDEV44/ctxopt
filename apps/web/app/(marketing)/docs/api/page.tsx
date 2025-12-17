import { CodeBlock } from "../components/CodeBlock";

export default function ApiReferencePage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">API Reference</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          CtxOpt provides a proxy API that is 100% compatible with the Anthropic
          Messages API. Simply change your base URL and API key to start
          tracking your token usage.
        </p>
      </div>

      {/* Base URL */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Base URL</h2>
        <CodeBlock code="https://api.ctxopt.com/v1" language="text" />
        <p className="mt-4 text-muted-foreground">
          All API requests should be made to this base URL. The proxy forwards
          requests to Anthropic and adds tracking headers to responses.
        </p>
      </section>

      {/* Authentication */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Authentication</h2>
        <p className="mb-4 text-muted-foreground">
          Authenticate your requests using your CtxOpt API key in the{" "}
          <code className="rounded bg-muted px-1">x-api-key</code> header.
        </p>
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Header</th>
                <th className="px-4 py-3 text-left font-medium">Value</th>
                <th className="px-4 py-3 text-left font-medium">Required</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-3">
                  <code className="rounded bg-muted px-1">x-api-key</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Your CtxOpt API key (starts with <code className="rounded bg-muted px-1">ctx_</code>)
                </td>
                <td className="px-4 py-3 text-muted-foreground">Yes</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3">
                  <code className="rounded bg-muted px-1">Content-Type</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <code className="rounded bg-muted px-1">application/json</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">Yes</td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <code className="rounded bg-muted px-1">anthropic-version</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  <code className="rounded bg-muted px-1">2023-06-01</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Optional (passed to Anthropic)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Messages Endpoint */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Messages Endpoint</h2>
        <div className="mb-4 flex items-center gap-3">
          <span className="rounded-md bg-green-500/10 px-2 py-1 text-sm font-semibold text-green-600">
            POST
          </span>
          <code className="text-lg">/messages</code>
        </div>
        <p className="mb-6 text-muted-foreground">
          Create a message using the Anthropic Claude API. The request format is
          identical to the{" "}
          <a
            href="https://docs.anthropic.com/en/api/messages"
            className="text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Anthropic Messages API
          </a>
          .
        </p>

        {/* Request Body */}
        <h3 className="mb-4 text-lg font-semibold">Request Body</h3>
        <CodeBlock
          code={`{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": "Hello, Claude!"
    }
  ]
}`}
          language="json"
          title="Request Body"
        />

        <div className="mt-6 rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Parameter</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-3">
                  <code className="rounded bg-muted px-1">model</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">string</td>
                <td className="px-4 py-3 text-muted-foreground">
                  The model to use (e.g., claude-sonnet-4-20250514)
                </td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3">
                  <code className="rounded bg-muted px-1">max_tokens</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">integer</td>
                <td className="px-4 py-3 text-muted-foreground">
                  Maximum tokens in the response
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <code className="rounded bg-muted px-1">messages</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">array</td>
                <td className="px-4 py-3 text-muted-foreground">
                  Array of message objects with role and content
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Response */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Response</h2>
        <p className="mb-4 text-muted-foreground">
          The response body is identical to the Anthropic API response. CtxOpt
          adds custom headers with usage metrics.
        </p>

        <h3 className="mb-4 text-lg font-semibold">CtxOpt Response Headers</h3>
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Header</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-3">
                  <code className="rounded bg-muted px-1">X-CtxOpt-Request-Id</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Unique identifier for this request
                </td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3">
                  <code className="rounded bg-muted px-1">X-CtxOpt-Input-Tokens</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Number of input tokens counted
                </td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3">
                  <code className="rounded bg-muted px-1">X-CtxOpt-Output-Tokens</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Number of output tokens in the response
                </td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3">
                  <code className="rounded bg-muted px-1">X-CtxOpt-Total-Cost-Micros</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Total cost in microdollars (1 microdollar = $0.000001)
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <code className="rounded bg-muted px-1">X-CtxOpt-Latency-Ms</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Total request latency in milliseconds
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Error Codes */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Error Codes</h2>
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-3">
                  <code className="rounded bg-red-500/10 px-2 py-1 text-red-600">401</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Invalid or missing API key
                </td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3">
                  <code className="rounded bg-yellow-500/10 px-2 py-1 text-yellow-600">429</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Rate limit exceeded or monthly quota reached
                </td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3">
                  <code className="rounded bg-red-500/10 px-2 py-1 text-red-600">500</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Internal server error
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <code className="rounded bg-red-500/10 px-2 py-1 text-red-600">502</code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Error from Anthropic API
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Examples */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Examples</h2>

        <div className="space-y-6">
          <div>
            <h3 className="mb-4 text-lg font-semibold">cURL</h3>
            <CodeBlock
              code={`curl -X POST https://api.ctxopt.com/v1/messages \\
  -H "x-api-key: ctx_your_api_key" \\
  -H "Content-Type: application/json" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1024,
    "messages": [
      {"role": "user", "content": "Explain quantum computing in one sentence."}
    ]
  }'`}
              language="bash"
            />
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">Python</h3>
            <CodeBlock
              code={`import anthropic

client = anthropic.Anthropic(
    api_key="ctx_your_api_key",
    base_url="https://api.ctxopt.com/v1"
)

message = client.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)

print(message.content)`}
              language="python"
            />
          </div>

          <div>
            <h3 className="mb-4 text-lg font-semibold">TypeScript</h3>
            <CodeBlock
              code={`import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: 'ctx_your_api_key',
  baseURL: 'https://api.ctxopt.com/v1',
});

const message = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }],
});

console.log(message.content);`}
              language="typescript"
            />
          </div>
        </div>
      </section>

      {/* Rate Limits */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Rate Limits</h2>
        <p className="mb-4 text-muted-foreground">
          Rate limits depend on your plan:
        </p>
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Plan</th>
                <th className="px-4 py-3 text-left font-medium">
                  Requests/minute
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Tokens/month
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-3 font-medium">Free</td>
                <td className="px-4 py-3 text-muted-foreground">20</td>
                <td className="px-4 py-3 text-muted-foreground">100K</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3 font-medium">Pro</td>
                <td className="px-4 py-3 text-muted-foreground">100</td>
                <td className="px-4 py-3 text-muted-foreground">10M</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium">Enterprise</td>
                <td className="px-4 py-3 text-muted-foreground">1000</td>
                <td className="px-4 py-3 text-muted-foreground">100M</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
