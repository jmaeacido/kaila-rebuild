import { NextResponse, type NextRequest } from "next/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/" && searchParams.get("route") === "public-post") {
    const postId = searchParams.get("post")?.trim();
    if (postId && uuidPattern.test(postId)) {
      return NextResponse.redirect(new URL(`/community/${postId}`, request.url), 301);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
