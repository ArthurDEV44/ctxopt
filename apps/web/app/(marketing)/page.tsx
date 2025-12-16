import Link from "next/link";

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="container flex flex-col items-center gap-8 py-24 text-center">
        <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm">
          <span className="mr-2 text-success">*</span>
          Now with MCP Server support
        </div>

        <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          Stop Wasting Tokens.
          <br />
          <span className="text-muted-foreground">Start Optimizing.</span>
        </h1>

        <p className="max-w-2xl text-xl text-muted-foreground">
          CtxOpt analyzes your LLM context in real-time, detects inefficiencies,
          and gives you actionable suggestions to reduce costs by up to 60%.
        </p>

        <div className="flex gap-4">
          <Link
            href="/sign-up"
            className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-lg font-medium text-primary-foreground hover:bg-primary/90"
          >
            Start Free
          </Link>
          <Link
            href="https://docs.ctxopt.dev"
            className="inline-flex h-12 items-center justify-center rounded-md border px-8 text-lg font-medium hover:bg-muted"
          >
            View Docs
          </Link>
        </div>

        <p className="text-sm text-muted-foreground">
          100K tokens/month free. No credit card required.
        </p>
      </section>

      {/* Features Section */}
      <section className="container py-24">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="rounded-lg border p-6">
            <div className="mb-4 text-3xl">&#9889;</div>
            <h3 className="mb-2 text-xl font-semibold">Real-time Analysis</h3>
            <p className="text-muted-foreground">
              Token counting and cost estimation on every request. See exactly
              where your budget goes.
            </p>
          </div>

          <div className="rounded-lg border p-6">
            <div className="mb-4 text-3xl">&#128161;</div>
            <h3 className="mb-2 text-xl font-semibold">Smart Suggestions</h3>
            <p className="text-muted-foreground">
              AI-powered recommendations to compress context, remove redundancy,
              and optimize prompts.
            </p>
          </div>

          <div className="rounded-lg border p-6">
            <div className="mb-4 text-3xl">&#128295;</div>
            <h3 className="mb-2 text-xl font-semibold">IDE Integration</h3>
            <p className="text-muted-foreground">
              Works with Claude Code, Cursor, and Windsurf. Just change your
              base URL and start saving.
            </p>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="border-t bg-muted/30 py-24">
        <div className="container">
          <h2 className="mb-12 text-center text-3xl font-bold">
            How It Works
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                1
              </div>
              <h3 className="mb-2 text-lg font-semibold">Connect</h3>
              <p className="text-muted-foreground">
                Point your AI tool to our proxy. One line change.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                2
              </div>
              <h3 className="mb-2 text-lg font-semibold">Analyze</h3>
              <p className="text-muted-foreground">
                We count tokens, detect patterns, and find optimizations.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                3
              </div>
              <h3 className="mb-2 text-lg font-semibold">Save</h3>
              <p className="text-muted-foreground">
                Apply suggestions and watch your costs drop.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24 text-center">
        <h2 className="mb-4 text-3xl font-bold">Ready to Optimize?</h2>
        <p className="mb-8 text-xl text-muted-foreground">
          Join developers saving thousands on LLM costs.
        </p>
        <Link
          href="/sign-up"
          className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-lg font-medium text-primary-foreground hover:bg-primary/90"
        >
          Get Started Free
        </Link>
      </section>
    </>
  );
}
