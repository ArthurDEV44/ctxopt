import Link from "next/link";
import { CodeBlock } from "../../components/CodeBlock";

export default function WindsurfGuidePage() {
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
        <h1 className="text-4xl font-bold tracking-tight">Windsurf</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Set up Windsurf with CtxOpt for intelligent context optimization.
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
            Windsurf IDE installed (
            <a
              href="https://codeium.com/windsurf"
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
              Open Windsurf and navigate to{" "}
              <strong>Settings &gt; AI Configuration</strong>.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-lg border p-6">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                2
              </div>
              <h3 className="text-lg font-semibold">Select Custom Provider</h3>
            </div>
            <p className="text-muted-foreground">
              In the AI settings, select <strong>&quot;Custom Provider&quot;</strong> or{" "}
              <strong>&quot;Anthropic (Custom)&quot;</strong>.
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-lg border p-6">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                3
              </div>
              <h3 className="text-lg font-semibold">Enter CtxOpt Settings</h3>
            </div>
            <p className="mb-4 text-muted-foreground">
              Configure the following settings:
            </p>
            <div className="space-y-3 rounded-lg bg-muted/50 p-4">
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Endpoint</span>
                <code className="rounded bg-muted px-1 text-sm">
                  https://api.ctxopt.com/v1/messages
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
              Save the configuration and use the AI assistant to verify the
              connection. Check your CtxOpt dashboard to confirm requests are
              being tracked.
            </p>
          </div>
        </div>
      </section>

      {/* Important Notes */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Important Notes</h2>
        <div className="space-y-4">
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
            <h4 className="mb-2 font-medium text-yellow-600">
              Version-Specific Configuration
            </h4>
            <p className="text-sm text-muted-foreground">
              Windsurf&apos;s configuration options may vary depending on your
              version. If you don&apos;t see the exact options mentioned above,
              look for similar settings like &quot;Custom Endpoint&quot; or &quot;API
              Override&quot;.
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">Endpoint Format</h4>
            <p className="text-sm text-muted-foreground">
              Windsurf may require the full endpoint URL including{" "}
              <code className="rounded bg-muted px-1">/messages</code> at the
              end, unlike other IDEs that only need the base URL.
            </p>
          </div>
        </div>
      </section>

      {/* Alternative: Environment Variables */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">
          Alternative: Environment Variables
        </h2>
        <p className="mb-4 text-muted-foreground">
          Some versions of Windsurf support environment variable configuration:
        </p>
        <CodeBlock
          code={`export ANTHROPIC_API_KEY="ctx_your_api_key"
export ANTHROPIC_BASE_URL="https://api.ctxopt.com/v1"`}
          language="bash"
        />
        <p className="mt-4 text-sm text-muted-foreground">
          Set these in your shell configuration and restart Windsurf.
        </p>
      </section>

      {/* Verification */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Verification</h2>
        <p className="mb-4 text-muted-foreground">To verify your setup:</p>
        <ol className="list-inside list-decimal space-y-2 text-muted-foreground">
          <li>Open a file in Windsurf</li>
          <li>Use the AI assistant (Cascade or inline completion)</li>
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
            <h4 className="mb-2 font-medium">
              &quot;Invalid endpoint&quot; or connection errors
            </h4>
            <p className="text-sm text-muted-foreground">
              Try both formats:{" "}
              <code className="rounded bg-muted px-1">
                https://api.ctxopt.com/v1
              </code>{" "}
              and{" "}
              <code className="rounded bg-muted px-1">
                https://api.ctxopt.com/v1/messages
              </code>
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">AI assistant not responding</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>- Verify your API key starts with <code className="rounded bg-muted px-1">ctx_</code></li>
              <li>- Check that the API key is active in your dashboard</li>
              <li>- Try restarting Windsurf after configuration changes</li>
            </ul>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">Using Windsurf&apos;s native AI</h4>
            <p className="text-sm text-muted-foreground">
              Note that Windsurf has its own AI (Cascade). If you want to track
              usage through CtxOpt, you need to use Windsurf&apos;s external model
              configuration, not the built-in Cascade AI.
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
