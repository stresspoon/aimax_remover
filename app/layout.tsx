import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "워터마크 제거 - AI Max Remover",
  description: "AI 기반 이동 워터마크 자동 감지 및 제거 웹앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

