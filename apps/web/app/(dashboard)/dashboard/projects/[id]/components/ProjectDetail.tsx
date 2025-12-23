"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OverviewTab } from "./OverviewTab";
import { ApiKeysTab } from "./ApiKeysTab";
import { SettingsTab } from "./SettingsTab";

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectDetailProps {
  project: Project;
}

export function ProjectDetail({ project }: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link
        href="/dashboard/projects"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{project.name}</h1>
        {project.description && (
          <p className="text-muted-foreground mt-1">{project.description}</p>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab project={project} />
        </TabsContent>

        <TabsContent value="api-keys" className="mt-6">
          <ApiKeysTab projectId={project.id} projectName={project.name} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab project={project} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
