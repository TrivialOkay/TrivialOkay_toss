import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://byeoril-day.stevechan970427.chatgpt.site"),
  title: "별일 관측국 — 하찮은 일을 쓸데없이 진지하게",
  description: "아무 일도 아닌 일을 관측하고, 속보로 보도하고, 하찮게 시상하는 운세 기록소입니다.",
  applicationName: "별일",
  openGraph: {
    title: "별일 관측국 — 하찮은 일을 쓸데없이 진지하게",
    description: "오늘의 미세한 우주 개입을 예보하고, 관측하고, 속보로 남겨보세요.",
    type: "website",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "별일 관측국 — 아무 일도 아닌 일을 관측하고 보도하고 시상합니다." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "별일 관측국 — 하찮은 일을 쓸데없이 진지하게",
    description: "오늘의 미세한 우주 개입을 예보하고, 관측하고, 속보로 남겨보세요.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
