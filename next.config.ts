import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["exceljs"],
  // Thư mục cha (D:\CDHC2) cũng có package-lock.json — chặn Turbopack quét ra ngoài.
  turbopack: { root: process.cwd() },
  experimental: {
    serverActions: {
      // Danh sách quân nhân dạng Excel/Word thường dưới 2 MB.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
