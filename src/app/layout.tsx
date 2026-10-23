import type { Metadata } from "next";
import "@/styles/globals.css";
import AppClientLayout from "@/components/layouts/AppClientLayout";
import appConfig from "@/packages/configs/app.config";
import seo from "@/packages/seo";
import { getThemeFontClassName } from "@/packages/utils/fonts";
export const metadata: Metadata = seo;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${getThemeFontClassName(appConfig.site.style)} h-full antialiased`}
    >
      <body suppressHydrationWarning={true}>
        <AppClientLayout>{children}</AppClientLayout>
      </body>
    </html>
  );
}
