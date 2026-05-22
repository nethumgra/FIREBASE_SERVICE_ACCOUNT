"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
// @ts-ignore
import { Capacitor } from "@capacitor/core";
// @ts-ignore
import { CapacitorUpdater } from "@capgo/capacitor-updater";
import { Package } from "lucide-react";

// Meka thamai app eke danata thiyena version eka
// Aluth update ekak yawaddi, Firebase eke mekata wada loku version ekak (e.g., "1.0.1") danna oni
const CURRENT_APP_VERSION = "1.0.0"; 

export default function AppUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState<{version: string, url: string} | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    // Web browser ekedi (Vercel eke) update popup eka pennanne na, Mobile App ekedi witharai pennanne
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      CapacitorUpdater.notifyAppReady();
      checkUpdate();
    }
  }, []);

  const checkUpdate = async () => {
    try {
      const docRef = doc(db, "app_config", "updates");
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Firebase eke thiyena version eka, me app eke version ekata wada aluth nam
        if (data.latestVersion && data.latestVersion !== CURRENT_APP_VERSION) {
          setUpdateAvailable({
            version: data.latestVersion,
            url: data.updateUrl // Firebase storage hari wena thanaka thiyena .zip file eke link eka
          });
        }
      }
    } catch (err) {
      console.error("Failed to check update", err);
    }
  };

  const handleUpdate = async () => {
    if (!updateAvailable) return;
    setDownloading(true);
    try {
      // 1. Aluth zip file eka download karanawa
      const version = await CapacitorUpdater.download({
        url: updateAvailable.url,
        version: updateAvailable.version,
      });
      // 2. Download wela iwara unama, app eka automatically reload wela aluth eka apply wenawa
      await CapacitorUpdater.set(version);
    } catch (err) {
      console.error("Update failed:", err);
      alert("Failed to download the update. Please check your connection.");
      setDownloading(false);
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm text-center shadow-2xl relative overflow-hidden">
        
        {/* Background decoration */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-50 rounded-full mix-blend-multiply opacity-70"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-50 rounded-full mix-blend-multiply opacity-70"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <Package size={32} className="text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">New Update Available</h2>
          <p className="text-gray-500 text-sm mb-8 leading-relaxed">
            Version <span className="font-bold text-green-700">{updateAvailable.version}</span> is ready to be installed. Please download the update to continue using the app with new features and improvements.
          </p>
          
          <button 
            onClick={handleUpdate}
            disabled={downloading}
            className={`w-full text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all ${
              downloading ? "bg-green-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 active:scale-95 shadow-lg shadow-green-600/30"
            }`}
          >
            {downloading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Downloading...
              </span>
            ) : "Download Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
