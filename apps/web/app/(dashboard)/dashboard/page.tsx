import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user.firstName || user.emailAddresses[0]?.emailAddress}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Tokens Used</p>
          <p className="text-3xl font-bold">0</p>
          <p className="text-xs text-muted-foreground">of 100,000 this month</p>
        </div>
        <div className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Estimated Cost</p>
          <p className="text-3xl font-bold">$0.00</p>
          <p className="text-xs text-muted-foreground">this month</p>
        </div>
        <div className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Requests</p>
          <p className="text-3xl font-bold">0</p>
          <p className="text-xs text-muted-foreground">this month</p>
        </div>
        <div className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Potential Savings</p>
          <p className="text-3xl font-bold text-success">$0.00</p>
          <p className="text-xs text-muted-foreground">based on suggestions</p>
        </div>
      </div>

      {/* Quick Start */}
      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-xl font-semibold">Quick Start</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              1
            </div>
            <div>
              <p className="font-medium">Create a Project</p>
              <p className="text-sm text-muted-foreground">
                Go to Projects and create your first project to get an API key.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              2
            </div>
            <div>
              <p className="font-medium">Install the MCP Server</p>
              <p className="text-sm text-muted-foreground">
                Add CtxOpt MCP Server to Claude Code, Cursor, or Windsurf.
              </p>
              <pre className="mt-2 rounded bg-muted p-2 text-xs">
                npx @ctxopt/mcp-server
              </pre>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              3
            </div>
            <div>
              <p className="font-medium">Start Coding</p>
              <p className="text-sm text-muted-foreground">
                Use your AI tool as normal. We'll track and analyze every
                request.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-xl font-semibold">Recent Activity</h2>
        <p className="text-muted-foreground">
          No activity yet. Start using the MCP server to see your sessions here.
        </p>
      </div>

      {/* Suggestions Placeholder */}
      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-xl font-semibold">Optimization Suggestions</h2>
        <p className="text-muted-foreground">
          No suggestions yet. We'll analyze your usage and provide
          recommendations.
        </p>
      </div>
    </div>
  );
}
