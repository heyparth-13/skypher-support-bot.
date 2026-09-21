import "./globals.css";

export const metadata = {
  title: "Skyphr AI — Client Support & Project Discovery",
  description: "Build Scalable Digital Products, SaaS Platforms & AI Systems. Instant support and consultation powered by Skyphr AI.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Skyphr AI",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F9FE" },
    { media: "(prefers-color-scheme: dark)", color: "#0B0E17" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
