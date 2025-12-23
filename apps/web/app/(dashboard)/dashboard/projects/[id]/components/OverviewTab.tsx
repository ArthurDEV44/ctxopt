"use client";

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface OverviewTabProps {
  project: Project;
}

export function OverviewTab({ project }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Project Information */}
      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Project Information</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Project Name
            </label>
            <p className="mt-1">{project.name}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Project Slug
            </label>
            <p className="mt-1 font-mono text-sm">{project.slug}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Created
            </label>
            <p className="mt-1">
              {new Date(project.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Last Updated
            </label>
            <p className="mt-1">
              {new Date(project.updatedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          {project.description && (
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-muted-foreground">
                Description
              </label>
              <p className="mt-1">{project.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Start */}
      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
        <div className="space-y-4 text-sm">
          <div>
            <p className="font-medium">1. Create an API Key</p>
            <p className="text-muted-foreground mt-1">
              Go to the API Keys tab to create a new API key for this project.
            </p>
          </div>
          <div>
            <p className="font-medium">2. Configure the MCP Server</p>
            <p className="text-muted-foreground mt-1">
              Add your API key to the CtxOpt MCP server configuration.
            </p>
            <pre className="mt-2 rounded bg-muted p-3 text-xs overflow-x-auto">
              CTXOPT_API_KEY=your_api_key_here
            </pre>
          </div>
          <div>
            <p className="font-medium">3. Start Optimizing</p>
            <p className="text-muted-foreground mt-1">
              Use MCP tools like smart_file_read and auto_optimize to reduce token usage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
