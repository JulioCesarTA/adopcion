import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

/**
 * El frontend hace de proxy del API (/api/v1 y /uploads). Así la cookie
 * httpOnly del refresh token queda en el dominio del frontend, el middleware
 * de Next puede verla y no hay problemas de cookies entre dominios
 * (ver DECISIONS.md).
 */
const nextConfig: NextConfig = {
  // Salida autocontenida para la imagen de Docker (solo lo necesario para correr).
  output: "standalone",
  // No revelar la versión de Next en las cabeceras.
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${BACKEND_URL}/api/v1/:path*` },
      { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
