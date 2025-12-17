import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "./components/DashboardContent";

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const userName = user.firstName || user.emailAddresses[0]?.emailAddress || "there";

  return <DashboardContent userName={userName} />;
}
