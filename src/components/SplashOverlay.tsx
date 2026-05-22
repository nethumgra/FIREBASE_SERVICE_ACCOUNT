"use client";

import { useEffect, useState } from "react";

export default function SplashOverlay() {
  const [visible, setVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade-out after 1.8s, fully remove after 2.3s
    const fadeTimer = setTimeout(() => setFadeOut(true), 1800);
    const hideTimer = setTimeout(() => setVisible(false), 2300);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#224b1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity 0.5s ease",
        opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? "none" : "all",
      }}
    >
      {/* Logo */}
      <div
        style={{
          marginBottom: "48px",
          animation: "splashFadeUp 0.7s ease-out forwards",
        }}
      >
        <img
          src="/logo.png"
          alt="Vito Delivery"
          style={{
            width: "min(65vw, 320px)",
            height: "auto",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>

      {/* Loading bar */}
      <div
        style={{
          width: "min(50vw, 200px)",
          height: "3px",
          borderRadius: "999px",
          overflow: "hidden",
          background: "rgba(255,255,255,0.2)",
          animation: "splashFadeUp 0.7s ease-out 0.3s both",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: "999px",
            background: "linear-gradient(90deg, #a8d5a2, #ffffff)",
            animation: "splashLoad 1.8s ease-in-out forwards",
          }}
        />
      </div>

      <style>{`
        @keyframes splashLoad {
          0%   { width: 0%; }
          60%  { width: 70%; }
          100% { width: 100%; }
        }
        @keyframes splashFadeUp {
          0%   { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
