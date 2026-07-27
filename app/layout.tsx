import type { Metadata } from "next";
import "./globals.css";

export function generateMetadata(): Metadata {
  const title = "Plot 3P · Living site plan";
  const description =
    "An interactive, scale-aware plan and seasonal sun/shade model for triangular allotment plot 3P at CERES Community Garden in Melbourne.";

  return {
    title,
    description,
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
