import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "aVioa | Solicitudes de traslados",
  description: "Registra, organiza y da seguimiento a los traslados de tus pasajeros.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
