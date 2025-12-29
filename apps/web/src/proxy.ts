import { createI18nMiddleware } from "fumadocs-core/i18n/middleware";
import { NextRequest, NextResponse, NextFetchEvent } from "next/server";
import { i18n } from "@/lib/i18n";

const i18nMiddleware = createI18nMiddleware(i18n);

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const pathname = request.nextUrl.pathname;

  // Handle root path - rewrite to default locale
  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/fr", request.url));
  }

  return i18nMiddleware(request, event);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)" ],
};
