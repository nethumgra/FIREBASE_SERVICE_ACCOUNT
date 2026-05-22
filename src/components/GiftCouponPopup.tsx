"use client";

import { useEffect, useState } from "react";
import { Gift, X, MapPin, Ticket } from "lucide-react";
import confetti from "canvas-confetti";
import { getCurrentUserProfile, onAuthChange } from "@/lib/auth";
import { GiftCoupon, onUserGiftCoupons } from "@/lib/db";

export default function GiftCouponPopup() {
  const [coupons, setCoupons] = useState<GiftCoupon[]>([]);
  const [closedCoupons, setClosedCoupons] = useState<Set<string>>(new Set());

  useEffect(() => {
    let unsubscribeCoupons: (() => void) | null = null;

    const authUnsub = onAuthChange(async (user) => {
      if (user) {
        unsubscribeCoupons = onUserGiftCoupons(user.uid, (data) => {
          setCoupons(data);
          
          // If a new coupon appears that isn't closed, trigger confetti!
          const activeNewCoupons = data.filter(c => !closedCoupons.has(c.id));
          if (activeNewCoupons.length > 0) {
            triggerConfetti();
          }
        });
      } else {
        if (unsubscribeCoupons) unsubscribeCoupons();
        setCoupons([]);
      }
    });

    return () => {
      authUnsub();
      if (unsubscribeCoupons) unsubscribeCoupons();
    };
  }, [closedCoupons]);

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const handleClose = (id: string) => {
    setClosedCoupons(prev => new Set(prev).add(id));
  };

  const handleOpen = (id: string) => {
    setClosedCoupons(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    triggerConfetti();
  };

  if (coupons.length === 0) return null;

  return (
    <>
      {coupons.map(coupon => {
        const isClosed = closedCoupons.has(coupon.id);

        if (isClosed) {
          return (
            <button
              key={coupon.id}
              onClick={() => handleOpen(coupon.id)}
              className="fixed bottom-24 right-4 z-50 bg-green-600 text-white rounded-full px-4 py-3 shadow-2xl flex items-center gap-2 animate-bounce hover:bg-green-700 transition-colors border-2 border-white"
            >
              <Gift size={20} />
              <span className="font-bold text-sm">My Gift!</span>
            </button>
          );
        }

        return (
          <div key={coupon.id} className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 relative border-4 border-green-500">
              {/* Header Art */}
              <div className="bg-gradient-to-br from-green-500 to-green-700 p-8 flex flex-col items-center justify-center text-white relative overflow-hidden">
                <button onClick={() => handleClose(coupon.id)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 p-1.5 rounded-full backdrop-blur-md">
                  <X size={20} />
                </button>
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-md border border-white/30 animate-pulse">
                  <Gift size={40} className="text-white" />
                </div>
                <h2 className="text-2xl font-black text-center mb-1 drop-shadow-md">You got a Gift! 🎉</h2>
                <p className="text-green-100 text-sm font-medium text-center">Street Game Special</p>
              </div>

              {/* Body */}
              <div className="p-6 flex flex-col items-center text-center">
                <div className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">Your Gift</div>
                <h3 className="text-2xl font-black text-gray-900 mb-6">{coupon.description}</h3>

                <div className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin size={18} className="text-blue-500" />
                    <span className="text-sm font-bold text-gray-700">Redeem at</span>
                  </div>
                  <div className="text-lg font-black text-gray-900 text-left pl-7">{coupon.shopName}</div>
                </div>

                <div className="w-full border-2 border-dashed border-green-500 bg-green-50 rounded-2xl p-5 mb-2">
                  <div className="text-xs text-green-700 font-bold uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                    <Ticket size={14} /> Secret Code
                  </div>
                  <div className="text-3xl font-black text-green-700 tracking-widest">{coupon.code}</div>
                </div>
                <p className="text-xs text-gray-400 mt-4">Show this code to the shop owner to claim your free gift!</p>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
