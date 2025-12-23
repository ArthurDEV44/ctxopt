import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ProjectDetail } from "./components/ProjectDetail";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Get internal user
  const [internalUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, user.id))
    .limit(1);

  if (!internalUser) {
    redirect("/sign-in");
  }

  // Get project with authorization check
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (!project || project.userId !== internalUser.id) {
    redirect("/dashboard/projects");
  }

  return (
    <ProjectDetail
      project={{
        id: project.id,
        name: project.name,
        slug: project.slug,
        description: project.description,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }}
    />
  );
}
