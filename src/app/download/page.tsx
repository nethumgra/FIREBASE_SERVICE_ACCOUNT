"use client";

import { useEffect, useState } from "react";
import { Download, Apple, Share, PlusSquare, Smartphone, SmartphoneNfc, Store, User } from "lucide-react";
import { useRouter } from "next/navigation";

type OS = "android" | "ios" | "desktop" | "unknown";

const GREEN = "#2d6a2d";
const GREEN_DARK = "#1c4a1c";

export default function DownloadPage() {
  const router = useRouter();
  const [os, setOs] = useState<OS>("unknown");

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/android/i.test(userAgent)) {
      setOs("android");
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
      setOs("ios");
    } else {
      setOs("desktop");
    }
  }, []);

  return (
    <div className="w-full min-h-dvh flex flex-col font-sans bg-[#f5f6fa]">
      
      {/* ===== DESKTOP HEADER ===== */}
      <header className="hidden sm:flex items-center justify-center z-50 sticky top-0 shadow-lg w-full" style={{ background: `linear-gradient(160deg, ${GREEN_DARK} 0%, ${GREEN} 100%)` }}>
        <div className="w-full max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Vito Logo" className="h-10 w-auto object-contain cursor-pointer" onClick={() => router.push('/home')} />
          </div>
          
          <div className="flex items-center gap-4">
             <button className="flex items-center gap-2 text-white/80 hover:text-white transition-colors font-medium text-sm" onClick={() => router.push('/shops')}>
                <Store size={18} /> All Shops
             </button>
             <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-full text-green-800 font-bold hover:bg-gray-100 transition-colors text-sm" onClick={() => router.push('/home')}>
                <User size={18} /> Continue to Web App
             </button>
          </div>
        </div>
      </header>

      {/* ===== MOBILE HEADER ===== */}
      <div className="w-full max-w-md mx-auto sm:hidden sticky top-0 z-50">
        <header className="pt-8 pb-4 px-4 flex items-center justify-between" style={{ background: `linear-gradient(160deg, ${GREEN_DARK} 0%, ${GREEN} 100%)` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Vito Logo" className="h-8 w-auto object-contain" />
          <button onClick={() => router.push('/home')} className="text-white text-sm font-bold bg-white/20 px-3 py-1.5 rounded-full">
            Skip
          </button>
        </header>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 relative">
          
          <div className="p-8 relative z-10 flex flex-col items-center text-center">
            
            <div className="w-24 h-24 rounded-2xl shadow-lg flex items-center justify-center mb-6 transform transition-transform hover:scale-105 duration-300" style={{ background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})` }}>
              <SmartphoneNfc className="text-white w-12 h-12" />
            </div>

            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Vito Delivery</h1>
            <p className="text-gray-500 mb-8 font-medium">Your favorite local delivery app.</p>

            {/* Android View */}
            {os === "android" && (
              <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="bg-green-50 text-green-700 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 mb-6 border border-green-200">
                  <Smartphone className="w-4 h-4" /> Android App Available
                </div>
                <a
                  href="/vito-delivery.apk"
                  download
                  className="w-full text-white font-bold py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})` }}
                >
                  <Download className="w-6 h-6 animate-bounce" />
                  Download APK
                </a>
                <p className="text-xs text-gray-400 mt-4 px-4">
                  Note: You might need to allow &quot;Install from unknown sources&quot; in your settings.
                </p>
              </div>
            )}

            {/* iOS View */}
            {os === "ios" && (
              <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                 <div className="bg-gray-100 text-gray-700 px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 mb-6">
                  <Apple className="w-4 h-4" /> iPhone Detected
                </div>
                <div className="bg-green-50 border border-green-100 rounded-2xl p-6 text-left w-full mb-4 shadow-sm">
                  <h3 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                    <span>Install Web App</span>
                  </h3>
                  <ol className="space-y-4 text-green-800 text-sm font-medium">
                    <li className="flex items-center gap-3">
                      <span className="bg-white p-1.5 rounded-lg shadow-sm border border-green-100">
                        <Share className="w-5 h-5 text-green-600" />
                      </span>
                      <span>1. Tap the <b>Share</b> button at the bottom of Safari.</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="bg-white p-1.5 rounded-lg shadow-sm border border-green-100">
                        <PlusSquare className="w-5 h-5 text-green-600" />
                      </span>
                      <span>2. Select <b>Add to Home Screen</b>.</span>
                    </li>
                  </ol>
                </div>
              </div>
            )}

            {/* Desktop View */}
            {os === "desktop" && (
              <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                <p className="text-gray-600 mb-6 font-medium px-4">
                  Scan this QR code with your phone&apos;s camera to download the app!
                </p>
                <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 mb-6 group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://vito-delivery.vercel.app/download" 
                    alt="QR Code" 
                    className="w-48 h-48 group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                
                <p className="text-xs text-gray-400 flex items-center gap-1 font-semibold">
                  Works on both iOS & Android <Smartphone className="w-3 h-3" />
                </p>
              </div>
            )}

            {/* Loading State */}
            {os === "unknown" && (
              <div className="w-full flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-green-100 border-t-green-600 rounded-full animate-spin"></div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
