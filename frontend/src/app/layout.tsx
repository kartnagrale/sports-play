import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700;900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grain bg-bg transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <div className="absolute top-4 right-4 z-50">
            <ThemeToggle />
          </div>
          <div className="relative z-10 min-h-screen">{children}</div>
          <Toaster
            position="top-right"
            toastOptions={{
              className: "dark:bg-[#1A1D24] dark:border-[rgba(255,255,255,0.1)] dark:text-[#FFFFFF] bg-[#FFFFFF] border-[#E4E4E7] text-[#09090B] font-body",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
