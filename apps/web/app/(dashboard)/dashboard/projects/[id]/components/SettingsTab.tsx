"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface SettingsTabProps {
  project: Project;
}

export function SettingsTab({ project }: SettingsTabProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleDelete = async () => {
    if (deleteConfirmText !== project.name) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/dashboard/projects");
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete project");
      }
    } catch {
      alert("Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Info */}
      <div className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Project Information</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Project ID
            </label>
            <p className="mt-1 font-mono text-sm">{project.id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Slug
            </label>
            <p className="mt-1 font-mono text-sm">{project.slug}</p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="rounded-lg border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-700 mb-4">Danger Zone</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Delete Project</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Once you delete a project, there is no going back. All API keys and
              usage data associated with this project will be permanently deleted.
            </p>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Delete Project
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteConfirm(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-background border shadow-lg p-6">
            <h2 className="text-xl font-semibold text-red-700 mb-2">
              Delete Project
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              This action cannot be undone. This will permanently delete the{" "}
              <strong>{project.name}</strong> project and all associated data.
            </p>

            <div className="mb-4">
              <label
                htmlFor="confirmName"
                className="block text-sm font-medium mb-1"
              >
                Type <strong>{project.name}</strong> to confirm:
              </label>
              <input
                id="confirmName"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                placeholder={project.name}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText("");
                }}
                className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting || deleteConfirmText !== project.name}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
