// Global CSS imports
import "../../styles/globals.css";

import * as React from "react";
import type { Metadata } from "next";
import ThemeRegistry from "@/theme/ThemeRegistry";
import AmplifyConfigProvider from "@/components/AmplifyConfigProvider";

export const metadata: Metadata = {
  title: {
    default: "ChillTask",
    template: "%s | ChillTask",
  },
  description: "Automated Slack message archiving to GitHub context folders for AI-powered development workflows",
  keywords: ["slack", "github", "automation", "context", "AI", "development"],
  authors: [{ name: "Chinchilla Enterprises" }],
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        />
      </head>
      <body style={{ margin: 0 }}>
        {/* New MUI v7 Theme System */}
        <ThemeRegistry>
          {/* Configure Amplify on client side */}
          <AmplifyConfigProvider />

          {/* Pages use DashboardLayout wrapper for new design */}
          {props.children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
