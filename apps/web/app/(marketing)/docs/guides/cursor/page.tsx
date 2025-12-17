import Link from "next/link";
import { CodeBlock } from "../../components/CodeBlock";

export default function CursorGuidePage() {
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
        <h1 className="text-4xl font-bold tracking-tight">Cursor</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Configure Cursor IDE to use CtxOpt for AI-assisted coding with token
          tracking.
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
            Cursor IDE installed (
            <a
              href="https://cursor.com"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              download
            </a>
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

      {/* Configuration Steps */}
      <section>
        <h2 className="mb-6 text-2xl font-semibold">Configuration</h2>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="rounded-lg border p-6">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                1
              </div>
              <h3 className="text-lg font-semibold">Open Settings</h3>
            </div>
            <p className="text-muted-foreground">
              Open Cursor and go to Settings using{" "}
              <kbd className="rounded border bg-muted px-2 py-0.5 text-sm">
                Cmd/Ctrl + ,
              </kbd>
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-lg border p-6">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                2
              </div>
              <h3 className="text-lg font-semibold">Navigate to AI Settings</h3>
            </div>
            <p className="text-muted-foreground">
              In the settings sidebar, find the <strong>&quot;AI&quot;</strong> or{" "}
              <strong>&quot;Models&quot;</strong> section.
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-lg border p-6">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                3
              </div>
              <h3 className="text-lg font-semibold">Configure Custom Provider</h3>
            </div>
            <p className="mb-4 text-muted-foreground">
              Set up a custom Anthropic provider with the following settings:
            </p>
            <div className="space-y-3 rounded-lg bg-muted/50 p-4">
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">API Provider</span>
                <span className="text-muted-foreground">Custom / Anthropic</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Base URL</span>
                <code className="rounded bg-muted px-1 text-sm">
                  https://api.ctxopt.com/v1
                </code>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">API Key</span>
                <code className="rounded bg-muted px-1 text-sm">
                  ctx_your_api_key
                </code>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="rounded-lg border p-6">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                4
              </div>
              <h3 className="text-lg font-semibold">Save and Test</h3>
            </div>
            <p className="text-muted-foreground">
              Save your settings and open the AI chat to test. Send a message
              and check your CtxOpt dashboard to confirm the request was
              tracked.
            </p>
          </div>
        </div>
      </section>

      {/* Available Models */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Available Models</h2>
        <p className="mb-4 text-muted-foreground">
          The following Claude models are available through CtxOpt:
        </p>
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Model</th>
                <th className="px-4 py-3 text-left font-medium">Best For</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-3">
                  <code className="rounded bg-muted px-1">
                    claude-opus-4-20250514
                  </code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Complex reasoning, analysis
                </td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3">
                  <code className="rounded bg-muted px-1">
                    claude-sonnet-4-20250514
                  </code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Balanced performance (recommended)
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3">
                  <code className="rounded bg-muted px-1">
                    claude-3-5-haiku-20241022
                  </code>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  Fast responses, simple tasks
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Alternative: Config File */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">
          Alternative: Configuration File
        </h2>
        <p className="mb-4 text-muted-foreground">
          You can also configure Cursor via the settings JSON file. Add or
          modify the AI provider configuration:
        </p>
        <CodeBlock
          code={`{
  "ai.anthropic.baseUrl": "https://api.ctxopt.com/v1",
  "ai.anthropic.apiKey": "ctx_your_api_key"
}`}
          language="json"
          title="settings.json"
        />
        <p className="mt-4 text-sm text-muted-foreground">
          Note: The exact configuration keys may vary depending on your Cursor
          version.
        </p>
      </section>

      {/* Verification */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Verification</h2>
        <p className="mb-4 text-muted-foreground">To verify your setup:</p>
        <ol className="list-inside list-decimal space-y-2 text-muted-foreground">
          <li>Open the AI chat panel in Cursor</li>
          <li>Send a test message</li>
          <li>
            Check your{" "}
            <Link href="/dashboard" className="text-primary hover:underline">
              CtxOpt dashboard
            </Link>{" "}
            for the request
          </li>
        </ol>
      </section>

      {/* Troubleshooting */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Troubleshooting</h2>
        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">AI chat not responding</h4>
            <p className="text-sm text-muted-foreground">
              Verify your API key is correct and the base URL includes{" "}
              <code className="rounded bg-muted px-1">/v1</code> at the end.
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">Requests not appearing in dashboard</h4>
            <p className="text-sm text-muted-foreground">
              Make sure you&apos;re using an API key that starts with{" "}
              <code className="rounded bg-muted px-1">ctx_</code> and not a
              direct Anthropic key.
            </p>
          </div>
        </div>
        <p className="mt-6 text-muted-foreground">
          Need more help? Check the{" "}
          <Link
            href="/docs/troubleshooting"
            className="text-primary hover:underline"
          >
            troubleshooting guide
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
