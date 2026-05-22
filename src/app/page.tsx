"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthChange } from "@/lib/auth";
import { getUserProfile } from "@/lib/db";

export default function SplashScreen() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    let isRedirecting = false;
    let authResolved = false;
    let timerDone = false;
    let currentUser: any = null;

    const timer = setTimeout(() => {
      timerDone = true;
      attemptRedirect();
    }, 2500);

    const unsubscribe = onAuthChange(async (user) => {
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          currentUser = profile;
        } catch (e) {
          console.error(e);
        }
      } else {
        currentUser = null;
      }
      authResolved = true;
      attemptRedirect();
    });

    const attemptRedirect = () => {
      if (timerDone && authResolved && !isRedirecting) {
        isRedirecting = true;
        if (currentUser) {
          localStorage.setItem("vito_user_city", currentUser.city);
          if (currentUser.role === "admin") router.replace("/admin");
          else if (currentUser.role === "seller") router.replace("/seller");
          else if (currentUser.role === "delivery") router.replace("/rider");
          else router.replace("/home");
        } else {
          router.replace("/auth");
        }
      }
    };

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [router]);

  if (!mounted) return null;

  return (
    <div 
      className="min-h-dvh flex flex-col items-center justify-center font-sans relative"
      style={{ background: '#224b1a' }}
    >
      <div className="flex flex-col items-center justify-center">
        {/* Logo from public folder - no filters, responsive size */}
        <div 
          style={{ animation: 'logoFadeIn 0.8s ease-out forwards', marginBottom: '48px' }}
        >
          <img 
            src="/logo.png" 
            alt="Vito Delivery Logo"
            style={{ 
              width: 'min(65vw, 320px)',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>

        {/* Loading Bar */}
        <div 
          style={{ 
            width: 'min(50vw, 200px)',
            height: '3px',
            borderRadius: '999px',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.2)',
            animation: 'logoFadeIn 1s ease-out 0.4s both'
          }}
        >
          <div 
            style={{ 
              height: '100%',
              borderRadius: '999px',
              background: 'linear-gradient(90deg, #a8d5a2, #ffffff)',
              animation: 'loadProgress 2.5s ease-in-out forwards',
            }}
          ></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes loadProgress {
          0% { width: 0%; }
          50% { width: 60%; }
          100% { width: 100%; }
        }
        @keyframes logoFadeIn {
          0% { opacity: 0; transform: translateY(16px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
