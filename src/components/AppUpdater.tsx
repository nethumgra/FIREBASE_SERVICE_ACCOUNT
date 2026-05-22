"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
// @ts-ignore
import { Capacitor } from "@capacitor/core";
// @ts-ignore
import { CapacitorUpdater } from "@capgo/capacitor-updater";

const CURRENT_APP_VERSION = "1.0.0"; 

export default function AppUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState<{version: string, url: string} | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let listener: any;
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      CapacitorUpdater.notifyAppReady();
      checkUpdate();

      CapacitorUpdater.addListener('download', (info: any) => {
        setProgress(Math.round(info.percent));
      }).then((l: any) => listener = l);
    }
    return () => {
      if (listener && listener.remove) {
        listener.remove();
      }
    };
  }, []);

  const checkUpdate = async () => {
    try {
      const docRef = doc(db, "app_config", "updates");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        let currentVersion = CURRENT_APP_VERSION;
        try {
            const current = await CapacitorUpdater.current();
            if (current && current.bundle && current.bundle.version !== 'builtin') {
                currentVersion = current.bundle.version;
            }
        } catch (e) {
            console.error("Could not get current bundle", e);
        }

        if (data.latestVersion && data.latestVersion !== currentVersion) {
          const updateData = { version: data.latestVersion, url: data.updateUrl };
          setUpdateAvailable(updateData);
          // Automatically start the update without user interaction
          startUpdate(updateData);
        }
      }
    } catch (err) {
      console.error("Failed to check update", err);
    }
  };

  const startUpdate = async (data: {version: string, url: string}) => {
    setProgress(0);
    try {
      const version = await CapacitorUpdater.download({
        url: data.url,
        version: data.version,
      });
      await CapacitorUpdater.set(version);
    } catch (err) {
      console.error("Update failed:", err);
      // Hide screen on fail so user can continue using the app
      setUpdateAvailable(null);
    }
  };

  if (!updateAvailable) return null;

  const progressWidth = progress + "%";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#224b1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Logo */}
      <img
        src="/logo.png"
        alt="Vito Delivery"
        style={{
          width: "min(65vw, 240px)",
          height: "auto",
          marginBottom: "60px",
          objectFit: "contain",
          animation: "pulseLogo 2s infinite ease-in-out",
        }}
      />

      <h2 style={{ color: "#fff", fontSize: "1.3rem", fontWeight: 600, marginBottom: "20px", letterSpacing: "0.5px" }}>
        Optimizing App...
      </h2>

      {/* Progress Bar */}
      <div style={{ width: "min(70vw, 280px)", background: "rgba(255,255,255,0.15)", height: "6px", borderRadius: "8px", overflow: "hidden", position: "relative" }}>
        <div 
          style={{ 
            width: progressWidth, 
            height: "100%", 
            background: "linear-gradient(90deg, #a8d5a2, #ffffff)", 
            borderRadius: "8px",
            transition: "width 0.2s ease-out" 
          }} 
        />
      </div>

      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.9rem", marginTop: "16px", fontWeight: 500 }}>
        {progress}% • Please wait
      </p>

      <style>{`
        @keyframes pulseLogo {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.03); opacity: 0.9; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
