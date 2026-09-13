import type { Metadata } from "next";
import "./globals.css";

export function generateMetadata(): Metadata {
  const title = "Plot 3K · The veggie patch";
  const description =
    "Plan rows and blocks of cut flowers, vegetables and herbs in Plot 3K. Scaled planting positions, seed instructions and a shareable garden checklist.";
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
