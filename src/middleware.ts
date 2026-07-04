import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware({ locales: ["en", "es"], defaultLocale: "en" });

// Link-preview bots (iMessage, WhatsApp, Slack, Facebook, Twitter/X...) hit the
// bare domain and mostly don't follow the locale redirect, so they never see
// the og:image/title meta tags. Serve them the default-locale page directly
// instead of redirecting.
const CRAWLER_UA = /facebookexternalhit|Facebot|Twitterbot|Slackbot|Discordbot|TelegramBot|LinkedInBot|WhatsApp|Pinterest|redditbot|vkShare|Applebot|iMessage/i;

export default function middleware(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  if (request.nextUrl.pathname === "/" && CRAWLER_UA.test(ua)) {
    return NextResponse.rewrite(new URL("/en", request.url));
  }
  return intlMiddleware(request);
}

export const config = { matcher: ["/((?!api|admin|_next|.*\\..*).*)"] };
