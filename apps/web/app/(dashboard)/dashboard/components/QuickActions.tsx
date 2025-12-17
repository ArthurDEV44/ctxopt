"use client";

import Link from "next/link";

export function QuickActions() {
  return (
    <div className="rounded-lg border p-6">
      <h2 className="mb-4 text-xl font-semibold">Quick Actions</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/dashboard/projects/new"
          className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          <span className="text-sm font-medium">Create Project</span>
        </Link>
        <Link
          href="/dashboard/api-keys"
          className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
          <span className="text-sm font-medium">Generate API Key</span>
        </Link>
        <Link
          href="/docs"
          className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-muted-foreground"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span className="text-sm font-medium">Documentation</span>
        </Link>
      </div>
    </div>
  );
}
