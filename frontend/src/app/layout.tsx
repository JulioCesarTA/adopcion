import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "Adopet", template: "%s · Adopet" },
  description: "Sistema de gestión de adopciones y trazabilidad sanitaria animal — Adopet",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      {/* Algunas extensiones del navegador agregan atributos al <body> antes de hidratar. */}
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
