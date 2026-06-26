import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'MissionBoard',
  description: 'Coordinate mission tasks with MissionBoard.',
};

const productionContentSecurityPolicy = [
  "default-src 'self'",
  "connect-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-src 'none'",
].join("; ");

const developmentContentSecurityPolicy = [
  "default-src 'self'",
  "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-src 'none'",
].join("; ");

const contentSecurityPolicy =
  process.env.NODE_ENV === "development"
    ? developmentContentSecurityPolicy
    : productionContentSecurityPolicy;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="darkreader-lock" />
        <meta
          httpEquiv="Content-Security-Policy"
          content={contentSecurityPolicy}
        />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
