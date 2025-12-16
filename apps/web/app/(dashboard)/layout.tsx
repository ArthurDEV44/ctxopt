import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

const navigation = [
  { name: "Overview", href: "/dashboard" },
  { name: "Analytics", href: "/dashboard/analytics" },
  { name: "Projects", href: "/dashboard/projects" },
  { name: "API Keys", href: "/dashboard/api-keys" },
  { name: "Settings", href: "/dashboard/settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-background">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b px-6">
            <Link href="/dashboard" className="text-xl font-bold">
              CtxOpt
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <UserButton afterSignOutUrl="/" />
              <div className="flex-1 truncate">
                <p className="text-sm font-medium">Account</p>
                <p className="text-xs text-muted-foreground">Free plan</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 pl-64">
        <div className="container py-8">{children}</div>
      </main>
    </div>
  );
}
