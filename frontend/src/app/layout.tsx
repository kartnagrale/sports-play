import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "NEML Badminton Championship",
  description: "Live auction & tournament management for NEML Badminton Championship",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grain">
        <div className="relative z-10 min-h-screen">{children}</div>
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "#1A1D24",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#FFFFFF",
              fontFamily: "Outfit, sans-serif",
            },
          }}
        />
      </body>
    </html>
  );
}
