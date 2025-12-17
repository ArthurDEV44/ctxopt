import Link from "next/link";

const guides = [
  {
    title: "Claude Code",
    description:
      "Integrate CtxOpt with Claude Code CLI for optimized token usage in your terminal.",
    href: "/docs/guides/claude-code",
    icon: "terminal",
  },
  {
    title: "Cursor",
    description:
      "Configure Cursor IDE to use CtxOpt for AI-assisted coding with token tracking.",
    href: "/docs/guides/cursor",
    icon: "code",
  },
  {
    title: "Windsurf",
    description:
      "Set up Windsurf with CtxOpt for intelligent context optimization.",
    href: "/docs/guides/windsurf",
    icon: "wind",
  },
];

export default function GuidesPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Integration Guides</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          Step-by-step guides for integrating CtxOpt with your favorite IDE or
          tool.
        </p>
      </div>

      {/* Guides Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {guides.map((guide) => (
          <Link
            key={guide.href}
            href={guide.href}
            className="group rounded-lg border p-6 transition-colors hover:border-primary"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              {guide.icon === "terminal" && (
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              )}
              {guide.icon === "code" && (
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              )}
              {guide.icon === "wind" && (
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                  />
                </svg>
              )}
            </div>
            <h2 className="mb-2 text-lg font-semibold group-hover:text-primary">
              {guide.title}
            </h2>
            <p className="text-sm text-muted-foreground">{guide.description}</p>
          </Link>
        ))}
      </div>

      {/* Direct API */}
      <section>
        <h2 className="mb-4 text-2xl font-semibold">Direct API Access</h2>
        <p className="mb-4 text-muted-foreground">
          You can also use CtxOpt directly via the API with any Anthropic SDK.
          Check the{" "}
          <Link href="/docs/api" className="text-primary hover:underline">
            API Reference
          </Link>{" "}
          for complete documentation.
        </p>
        <div className="rounded-lg border bg-muted/30 p-6">
          <p className="mb-4 text-sm text-muted-foreground">
            Simply change your base URL and API key:
          </p>
          <ul className="space-y-2 text-sm">
            <li>
              <span className="font-medium">Base URL:</span>{" "}
              <code className="rounded bg-muted px-1">
                https://api.ctxopt.com/v1
              </code>
            </li>
            <li>
              <span className="font-medium">API Key:</span>{" "}
              <code className="rounded bg-muted px-1">ctx_your_api_key</code>
            </li>
          </ul>
        </div>
      </section>

      {/* Common Setup */}
      <section className="rounded-lg border bg-muted/30 p-6">
        <h2 className="mb-4 text-lg font-semibold">Before You Start</h2>
        <p className="mb-4 text-muted-foreground">
          For all integrations, you&apos;ll need:
        </p>
        <ul className="space-y-2 text-sm text-muted-foreground">
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
            A CtxOpt account (
            <Link href="/sign-up" className="text-primary hover:underline">
              sign up free
            </Link>
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
            An API key from your{" "}
            <Link href="/dashboard" className="text-primary hover:underline">
              dashboard
            </Link>
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
            Your preferred IDE or tool installed
          </li>
        </ul>
      </section>
    </div>
  );
}
