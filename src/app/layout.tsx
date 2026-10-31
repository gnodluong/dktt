import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { SwRegister } from "@/components/SwRegister";

const sans = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

const cond = Barlow_Condensed({
  subsets: ["vietnamese", "latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cond",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Tiếp thân nhân · Đại đội 5",
    template: "%s · Đại đội 5",
  },
  description:
    "Đăng ký và xác nhận tiếp thân nhân quân nhân Đại đội 5, Tiểu đoàn 2, Trường Cao đẳng Hậu cần 2.",
  manifest: "/manifest.webmanifest",
  applicationName: "Tiếp thân nhân",
  appleWebApp: {
    capable: true,
    title: "Tiếp thân nhân",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eff0e8" },
    { media: "(prefers-color-scheme: dark)", color: "#12140d" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${sans.variable} ${cond.variable}`}>
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
