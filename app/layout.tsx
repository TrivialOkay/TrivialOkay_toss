import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "별일 — 하찮은 운세 기록소",
  description: "오늘의 하찮은 운세를 확인하고, 정말 일어났는지 기록해 나만의 별일 도감을 채워보세요.",
  applicationName: "별일",
  openGraph: {
    title: "별일 — 하찮은 운세 기록소",
    description: "대단한 일은 없었어도, 오늘의 작은 별일은 남겨두세요.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={geist.variable}>{children}</body>
    </html>
  );
}
