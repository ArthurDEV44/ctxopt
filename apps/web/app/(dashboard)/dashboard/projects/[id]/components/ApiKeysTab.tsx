"use client";

import { useState } from "react";
import { useApiKeys } from "@/lib/hooks/useApiKeys";
import type { ApiKey } from "@ctxopt/shared";

interface ApiKeysTabProps {
  projectId: string;
  projectName: string;
}

export function ApiKeysTab({ projectId, projectName }: ApiKeysTabProps) {
  const [newKey, setNewKey] = useState<{ key: string; name: string } | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { apiKeys, isLoading, error, createKey, revokeKey } = useApiKeys({
    projectId,
  });

  const handleCreate = async (name: string) => {
    const result = await createKey({ name });
    if (result) {
      setNewKey({ key: result.apiKey.key, name: result.apiKey.name });
      setShowCreateDialog(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (confirm("Are you sure you want to revoke this API key? This cannot be undone.")) {
      await revokeKey(keyId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Manage API keys for usage tracking
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create API Key
        </button>
      </div>

      {/* New Key Display */}
      {newKey && (
        <NewKeyDisplay
          keyValue={newKey.key}
          keyName={newKey.name}
          onDismiss={() => setNewKey(null)}
        />
      )}

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* API Keys List */}
      <ApiKeysList
        apiKeys={apiKeys}
        isLoading={isLoading}
        projectName={projectName}
        onRevoke={handleRevoke}
      />

      {/* Setup Instructions */}
      <div className="rounded-lg border p-6">
        <h3 className="mb-4 text-sm font-semibold">Setup Instructions</h3>
        <div className="space-y-3 text-sm">
          <div>
            <p className="font-medium">1. Configure your environment:</p>
            <pre className="mt-2 rounded bg-muted p-3 text-xs overflow-x-auto">
              CTXOPT_API_KEY=your_api_key_here
            </pre>
          </div>
          <div>
            <p className="font-medium">2. Start using CtxOpt:</p>
            <p className="text-muted-foreground mt-1">
              Usage data will be automatically reported to your dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      {showCreateDialog && (
        <CreateApiKeyDialog
          projectName={projectName}
          onClose={() => setShowCreateDialog(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

// Sub-components

interface ApiKeysListProps {
  apiKeys: ApiKey[];
  isLoading: boolean;
  projectName: string;
  onRevoke: (keyId: string) => void;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "Never";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return "Never";
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) return formatDate(date);
  if (diffDays > 0) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffMins > 0) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  return "Just now";
}

function ApiKeysList({ apiKeys, isLoading, projectName, onRevoke }: ApiKeysListProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <div className="p-6 text-center text-muted-foreground">Loading API keys...</div>
      </div>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg className="h-6 w-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h3 className="font-semibold mb-1">No API Keys</h3>
        <p className="text-sm text-muted-foreground">
          Create an API key to start tracking usage for {projectName}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border divide-y">
      {apiKeys.map((key) => (
        <div key={key.id} className="p-4 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{key.name}</span>
              <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">
                {key.keyPrefix}...
              </code>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Created: {formatDate(key.createdAt)}</span>
              <span>Last used: {formatRelativeTime(key.lastUsedAt)}</span>
            </div>
          </div>
          <button
            onClick={() => onRevoke(key.id)}
            className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
          >
            Revoke
          </button>
        </div>
      ))}
    </div>
  );
}

interface CreateApiKeyDialogProps {
  projectName: string;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

function CreateApiKeyDialog({ projectName, onClose, onCreate }: CreateApiKeyDialogProps) {
  const [name, setName] = useState("Default");
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    await onCreate(name);
    setIsCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-background border shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-1">Create API Key</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Create a new API key for {projectName}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="keyName" className="block text-sm font-medium mb-1">
                Key Name
              </label>
              <input
                id="keyName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Production, CI/CD, Development"
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                maxLength={50}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                A friendly name to identify this key
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              disabled={isCreating || !name.trim()}
            >
              {isCreating ? "Creating..." : "Create Key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface NewKeyDisplayProps {
  keyValue: string;
  keyName: string;
  onDismiss: () => void;
}

function NewKeyDisplay({ keyValue, keyName, onDismiss }: NewKeyDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(keyValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100">
          <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-green-800">API Key Created</h3>
          <p className="text-sm text-green-700 mt-1">
            Your API key &quot;{keyName}&quot; has been created. Copy it now - it won&apos;t be shown again!
          </p>

          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded bg-white border border-green-200 px-3 py-2 text-xs font-mono break-all">
              {keyValue}
            </code>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="mt-3">
            <button
              onClick={onDismiss}
              className="text-sm text-green-700 hover:text-green-800 underline"
            >
              I&apos;ve saved my key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
