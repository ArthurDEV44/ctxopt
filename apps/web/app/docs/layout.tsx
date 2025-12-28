import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { source } from "@/lib/source";
import { RootProvider } from "fumadocs-ui/provider/next";
import "fumadocs-ui/style.css";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <DocsLayout
        tree={source.pageTree}
        nav={{
          title: "Distill",
          url: "/",
        }}
        sidebar={{
          defaultOpenLevel: 1,
        }}
        links={[
          {
            text: "GitHub",
            url: "https://github.com/ArthurDEV44/ctxopt",
            external: true,
          },
        ]}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
