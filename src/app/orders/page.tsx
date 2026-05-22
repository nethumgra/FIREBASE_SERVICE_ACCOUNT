"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShoppingBag, Clock, CheckCircle2, XCircle, Package, Truck, MapPin, Home, Tag, User, Plus } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getCustomerOrders, Order } from "@/lib/db";

const STATUS_CONFIG: Record<Order["status"], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:    { label: "Pending",    color: "#b45309", bg: "#fef3c7", icon: <Clock size={14} /> },
  confirmed:  { label: "Confirmed",  color: "#1d4ed8", bg: "#dbeafe", icon: <CheckCircle2 size={14} /> },
  preparing:  { label: "Preparing",  color: "#7c3aed", bg: "#ede9fe", icon: <Package size={14} /> },
  picked_up:  { label: "On the Way", color: "#0369a1", bg: "#e0f2fe", icon: <Truck size={14} /> },
  delivered:  { label: "Delivered",  color: "#15803d", bg: "#dcfce7", icon: <CheckCircle2 size={14} /> },
  cancelled:  { label: "Cancelled",  color: "#dc2626", bg: "#fee2e2", icon: <XCircle size={14} /> },
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("orders");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/auth"); return; }
      try {
        const data = await getCustomerOrders(user.uid);
        setOrders(data);
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    });
    return () => unsub();
  }, [router]);

  const greenGrad = "linear-gradient(160deg, #1c3f1c 0%, #2d6a2d 100%)";

  return (
    <div className="w-full max-w-md mx-auto min-h-dvh flex flex-col font-sans bg-[#f8f9fa] shadow-2xl relative pb-20">

      {/* Header */}
      <div className="flex items-center px-4 pt-10 pb-4 sticky top-0 z-50 shadow-md" style={{ background: greenGrad }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white mr-3 hover:bg-white/30 transition-colors">
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-white text-lg font-bold tracking-wide">My Orders</h1>
          <p className="text-green-100 text-xs">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="flex-1 px-4 pt-5 pb-10">
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-3/4 mb-4" />
                <div className="h-8 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag size={36} className="text-gray-300" />
            </div>
            <h2 className="text-gray-800 font-bold text-lg mb-1">No orders yet</h2>
            <p className="text-gray-400 text-sm mb-6">Your orders will appear here once you place one.</p>
            <button onClick={() => router.push("/home")}
              className="px-6 py-3 rounded-xl text-white font-bold text-sm shadow-md"
              style={{ background: "linear-gradient(135deg, #2d6a2d, #348a34)" }}>
              Browse Shops
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map(order => {
              const statusCfg = STATUS_CONFIG[order.status];
              return (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
                  {/* Status bar */}
                  <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-50"
                    style={{ background: statusCfg.bg }}>
                    <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: statusCfg.color }}>
                      {statusCfg.icon}
                      {statusCfg.label}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      {order.createdAt?.toDate?.().toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) || "Just now"}
                    </span>
                  </div>

                  <div className="p-4">
                    {/* Shop name */}
                    <h3 className="font-bold text-gray-900 text-sm mb-1">{order.shopName || "Shop"}</h3>

                    {/* Items */}
                    <div className="flex flex-col gap-0.5 mb-3">
                      {order.items.map((item, i) => (
                        <p key={i} className="text-xs text-gray-500">
                          {item.quantity}× {item.name}
                          <span className="text-gray-400 ml-1">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                        </p>
                      ))}
                    </div>

                    {/* Address */}
                    <div className="flex items-start gap-1.5 mb-3">
                      <MapPin size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-gray-400 leading-snug">{order.deliveryAddress}</p>
                    </div>

                    {/* Preparation Status & Time */}
                    {(order.status === "confirmed" || order.status === "preparing") && (order.preparationStatus || order.estimatedTime) && (
                      <div className="flex items-center justify-between bg-blue-50/50 p-2 rounded-lg mb-3 border border-blue-50">
                        {order.preparationStatus && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-xs font-bold text-blue-700">{order.preparationStatus}</span>
                          </div>
                        )}
                        {(() => {
                          if (!order.estimatedTime) return null;
                          let remainingText = order.estimatedTime;
                          if (order.updatedAt) {
                            const match = order.estimatedTime.match(/(\d+)/);
                            if (match) {
                              const totalSeconds = parseInt(match[1]) * 60;
                              // Handle both Timestamp objects and plain Date-like objects
                              const updatedTime = typeof order.updatedAt.toMillis === "function" 
                                ? order.updatedAt.toMillis() 
                                : order.updatedAt.seconds * 1000;
                              
                              if (updatedTime) {
                                const diffSeconds = Math.floor((updatedTime + totalSeconds * 1000 - now) / 1000);
                                if (diffSeconds > 0) {
                                  const m = Math.floor(diffSeconds / 60);
                                  const s = diffSeconds % 60;
                                  remainingText = `${m}m ${s}s`;
                                } else {
                                  remainingText = "Ready";
                                }
                              }
                            }
                          }
                          return (
                            <div className="text-[11px] font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md w-[80px] text-center">
                              {remainingText === "Ready" ? "Ready" : remainingText}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Total */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                      <div>
                        <p className="text-[10px] text-gray-400 font-medium">Delivery Fee</p>
                        <p className="text-xs font-bold text-gray-600">Rs. {order.deliveryFee.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Total</p>
                        <p className="text-base font-black text-[#2d6a2d]">Rs. {order.totalAmount.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== BOTTOM NAVIGATION ===== */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex items-center justify-around z-50"
        style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.08)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', paddingTop: 8 }}>

        {/* Home */}
        <NavBtn id="home" label="Home" active={activeNav === "home"} onClick={() => { setActiveNav("home"); router.push("/home"); }}>
          <Home size={22} />
        </NavBtn>
        {/* Items */}
        <NavBtn id="offers" label="Items" active={activeNav === "offers"} onClick={() => { setActiveNav("offers"); router.push("/shops"); }}>
          <Tag size={22} />
        </NavBtn>
        {/* Center Cart */}
        <div className="flex justify-center items-end flex-1" style={{ paddingBottom: 4 }}>
          <button
            aria-label="Cart"
            onClick={() => {
              window.dispatchEvent(new Event("cart-updated"));
            }}
            className="w-14 h-14 rounded-full text-white flex items-center justify-center border-4 border-white"
            style={{
              background: `linear-gradient(145deg, #348a34, #255525)`,
              transform: 'translateY(-18px)',
            }}
          >
            <Plus size={30} strokeWidth={2.5} />
          </button>
        </div>
        {/* Orders */}
        <NavBtn id="orders" label="Orders" active={activeNav === "orders"} onClick={() => { setActiveNav("orders"); router.push("/orders"); }}>
          <Package size={22} />
        </NavBtn>
        {/* Profile */}
        <NavBtn id="profile" label="Profile" active={activeNav === "profile"} onClick={() => { setActiveNav("profile"); router.push("/profile"); }}>
          <User size={22} />
        </NavBtn>
      </nav>
    </div>
  );
}

/* ---- Nav Button ---- */
function NavBtn({ id, children, label, active, onClick }: {
  id: string; children: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all flex-1 ${active ? "text-green-700" : "text-gray-400 hover:text-gray-600"}`}>
      <div className={`transition-transform ${active ? "scale-110" : "scale-100"}`}>{children}</div>
      <span className={`text-[10px] font-semibold tracking-wide ${active ? "opacity-100" : "opacity-80"}`}>{label}</span>
    </button>
  );
}
