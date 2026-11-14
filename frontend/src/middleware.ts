import { NextResponse, type NextRequest } from "next/server";

/** Rutas del sitio público: no requieren sesión. */
const PUBLIC_PATHS = ["/", "/login", "/registro", "/terminos", "/privacidad"];

/** Redirige a /login cuando una ruta privada no tiene cookie de sesión (refresh token). */
export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  if (!req.cookies.has("refresh_token")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Todo salvo el API proxied, archivos estáticos y assets de Next
  matcher: ["/((?!api|uploads|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
