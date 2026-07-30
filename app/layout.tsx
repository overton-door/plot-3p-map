import type { Metadata } from "next";
import "./globals.css";

export function generateMetadata(): Metadata {
  const title = "Plot 3P · Intelligent planting planner";
  const description =
    "Plan vegetables on a scale map of triangular allotment Plot 3P using Melbourne seasons, mature spacing, sun and shade, access, intensive grids, and interplanting.";
  const basePath = process.env.GITHUB_ACTIONS ? "/plot-3p-map" : "";

  return {
    title,
    description,
    icons: {
      icon: `${basePath}/favicon.svg`,
      shortcut: `${basePath}/favicon.svg`,
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
