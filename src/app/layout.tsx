import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import dynamic from "next/dynamic";

const GlobalCart = dynamic(() => import("@/components/GlobalCart"), { ssr: false });
const SplashOverlay = dynamic(() => import("@/components/SplashOverlay"), { ssr: false });
const AppUpdater = dynamic(() => import("@/components/AppUpdater"), { ssr: false });

const GiftCouponPopup = dynamic(() => import("@/components/GiftCouponPopup"), { ssr: false });

export const metadata: Metadata = {
  title: "Vito Delivery - Fast Delivery in Your City",
  description:
    "Order from your favorite local shops and get it delivered to your doorstep. Vito Delivery connects you with shops in your city.",
  keywords: ["delivery", "food delivery", "local shops", "order online", "Sri Lanka"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans bg-[#f3f4f6]">
        <AppUpdater />
        <SplashOverlay />
        {children}
        <Suspense fallback={null}>
          <GlobalCart />
        </Suspense>
        <GiftCouponPopup />
      </body>
    </html>
  );
}
