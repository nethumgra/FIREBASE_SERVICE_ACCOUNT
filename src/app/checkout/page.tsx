"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, MapPin, Navigation, CheckCircle2,
  ArrowRight, X, ShoppingBag, Truck, Receipt, Clock, Trash2, Minus, Plus as PlusIcon
} from "lucide-react";
import { toast } from "react-hot-toast";
import { getShopById, createOrder } from "@/lib/db";
import { auth } from "@/lib/firebase";
import dynamic from "next/dynamic";

const RouteMap = dynamic(() => import("@/components/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="bg-gray-50 rounded-2xl h-64 flex items-center justify-center border border-gray-100">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        <span className="text-xs text-gray-400 font-medium">Loading map...</span>
      </div>
    </div>
  )
});

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  qty: number;
  deliveryCharge?: number;
}

interface CartData {
  items: CartItem[];
  shopId?: string;
  shopName?: string;
  deliveryCharge?: number;
}

const GREEN = "#2d6a2d";
const GREEN_DARK = "#1c4a1c";
const GREEN_LIGHT = "#348a34";

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string>("");
  const [shopCoords, setShopCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [address, setAddress] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [locationCaptured, setLocationCaptured] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const getDeliveryCharge = (km: number): number => {
    if (km <= 2) return 100;
    if (km <= 3) return 120;
    if (km <= 4) return 150;
    const extraKm = Math.ceil(km - 4);
    return 150 + extraKm * 20;
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("loversmart_cart");
      if (saved) {
        const parsed: CartData = JSON.parse(saved);
        setCart(parsed.items || []);
        if (parsed.shopId) {
          setShopId(parsed.shopId);
          setShopName(parsed.shopName || "");
          getShopById(parsed.shopId).then(shop => {
            if (shop?.lat && shop?.lng) {
              setShopCoords({ lat: shop.lat, lng: shop.lng });
            }
          }).catch(console.error);
        }
      }
    } catch (err) { console.error(err); }
  }, []);

  const handleShareLocation = () => {
    setIsLocating(true);
    setLocationCaptured(false);
    setCustomerCoords(null);
    setRouteDistanceKm(null);

    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not supported on this device.");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        setCustomerCoords({ lat, lng });
        setLocationCaptured(true);
        setIsLocating(false);
        toast.success(`Location captured! (±${Math.round(accuracy)}m) 📍`);
      },
      (err) => {
        setIsLocating(false);
        setLocationCaptured(false);
        if (err.code === 1) toast.error("Location permission denied.");
        else if (err.code === 2) toast.error("Location unavailable. Try again.");
        else toast.error("Location timeout. Please try again.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleBuyNow = async () => {
    if (!address && !locationCaptured) {
      toast.error("Please provide a delivery address or share live location.");
      return;
    }
    setIsPlacingOrder(true);
    try {
      const user = auth.currentUser;
      const customerId = user?.uid || "guest_" + Date.now();
      const deliveryAddress = address ||
        (customerCoords ? `GPS: ${customerCoords.lat.toFixed(5)}, ${customerCoords.lng.toFixed(5)}` : "Unknown");

      const orderItems = cart.map(item => ({
        productId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.qty,
      }));

      await createOrder({
        customerId,
        shopId: shopId || "",
        shopName: shopName || "",
        items: orderItems,
        totalAmount: total,
        deliveryFee,
        deliveryAddress,
        city: localStorage.getItem("vito_user_city") || "Unknown",
        note: routeDistanceKm ? `Distance: ${routeDistanceKm.toFixed(1)} km` : undefined,
      });

      localStorage.removeItem("loversmart_cart");
      window.dispatchEvent(new Event("cart-updated"));
      toast.success("Order Placed Successfully! 🎉");
      setTimeout(() => router.push("/orders"), 1000);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to place order. Try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Remove or decrease item quantity in cart
  const handleRemoveItem = (itemId: string) => {
    setCart(prev => {
      const updated = prev
        .map(item => item.id === itemId ? { ...item, qty: item.qty - 1 } : item)
        .filter(item => item.qty > 0);
      // Persist to localStorage
      try {
        const raw = localStorage.getItem("loversmart_cart");
        if (raw) {
          const cartData = JSON.parse(raw);
          cartData.items = updated;
          localStorage.setItem("loversmart_cart", JSON.stringify(cartData));
          window.dispatchEvent(new Event("cart-updated"));
        }
      } catch {}
      return updated;
    });
  };

  const handleDeleteItem = (itemId: string) => {
    setCart(prev => {
      const updated = prev.filter(item => item.id !== itemId);
      try {
        const raw = localStorage.getItem("loversmart_cart");
        if (raw) {
          const cartData = JSON.parse(raw);
          cartData.items = updated;
          localStorage.setItem("loversmart_cart", JSON.stringify(cartData));
          window.dispatchEvent(new Event("cart-updated"));
        }
      } catch {}
      return updated;
    });
  };

  const handleIncreaseItem = (itemId: string) => {
    setCart(prev => {
      const updated = prev.map(item => item.id === itemId ? { ...item, qty: item.qty + 1 } : item);
      try {
        const raw = localStorage.getItem("loversmart_cart");
        if (raw) {
          const cartData = JSON.parse(raw);
          cartData.items = updated;
          localStorage.setItem("loversmart_cart", JSON.stringify(cartData));
          window.dispatchEvent(new Event("cart-updated"));
        }
      } catch {}
      return updated;
    });
  };

  const subtotal = cart.reduce((t, i) => t + i.price * i.qty, 0);
  const deliveryFee = cart.length > 0
    ? (routeDistanceKm !== null ? getDeliveryCharge(routeDistanceKm) : 150)
    : 0;
  const total = subtotal + deliveryFee;

  /* ---- Empty cart ---- */
  if (cart.length === 0) return (
    <div className="w-full min-h-dvh flex flex-col font-sans bg-[#f5f6fa] items-center justify-center">
      <div className="p-6 bg-white rounded-3xl shadow-sm mb-5 border border-gray-100">
        <ShoppingBag size={48} className="text-gray-200" />
      </div>
      <h2 className="text-gray-700 font-bold text-xl mb-2">Your cart is empty</h2>
      <p className="text-gray-400 text-sm mb-6">Add items from a shop first.</p>
      <button onClick={() => router.back()}
        className="px-8 py-3 text-white rounded-full font-bold shadow-lg hover:opacity-90 transition-all"
        style={{ background: `linear-gradient(135deg, ${GREEN_LIGHT}, ${GREEN_DARK})` }}
      >
        Go back to shop
      </button>
    </div>
  );

  return (
    <div className="w-full min-h-dvh flex flex-col font-sans bg-[#f5f6fa]">

      {/* ===== HEADER ===== */}
      <header
        className="w-full sticky top-0 z-50 shadow-lg"
        style={{ background: `linear-gradient(160deg, ${GREEN_DARK} 0%, ${GREEN} 100%)` }}
      >
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-4 flex items-center gap-4">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors flex-shrink-0"
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="text-white text-lg sm:text-xl font-bold tracking-wide">Checkout</h1>
            {shopName && (
              <p className="text-white/60 text-xs font-medium">{shopName}</p>
            )}
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10 items-start">

          {/* ===== LEFT COLUMN: Order + Address (3/5 width on desktop) ===== */}
          <div className="lg:col-span-3 flex flex-col gap-6">

            {/* 1. Order Summary */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${GREEN_LIGHT}22, ${GREEN_DARK}11)` }}>
                  <ShoppingBag size={16} style={{ color: GREEN }} />
                </div>
                <h2 className="font-bold text-gray-800 text-sm sm:text-base uppercase tracking-wider">Order Summary</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100">
                      <img src={item.image || "/placeholder.jpg"} alt={item.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-[13px] sm:text-sm line-clamp-1">{item.name}</p>
                      <p className="font-bold text-sm mt-0.5" style={{ color: GREEN }}>Rs. {(item.price * item.qty).toLocaleString()}</p>
                    </div>
                    {/* Qty Controls */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors active:scale-90"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-6 text-center font-bold text-sm text-gray-800">{item.qty}</span>
                      <button
                        onClick={() => handleIncreaseItem(item.id)}
                        className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors active:scale-90"
                      >
                        <PlusIcon size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 hover:text-red-600 transition-colors ml-1 active:scale-90"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-gray-50 flex justify-between items-center">
                <span className="text-sm text-gray-500 font-medium">{cart.length} item{cart.length > 1 ? "s" : ""}</span>
                <span className="font-bold text-gray-800 text-sm">Rs. {subtotal.toLocaleString()}</span>
              </div>
            </section>

            {/* 2. Delivery Address */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${GREEN_LIGHT}22, ${GREEN_DARK}11)` }}>
                  <MapPin size={16} style={{ color: GREEN }} />
                </div>
                <h2 className="font-bold text-gray-800 text-sm sm:text-base uppercase tracking-wider">Delivery Address</h2>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <textarea
                  placeholder="Enter your full delivery address..."
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full bg-gray-50 rounded-xl p-3.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-green-500/20 border border-gray-100 resize-none h-24 transition-shadow"
                />

                {/* Fallback map preview */}
                {!locationCaptured && (
                  <div className="w-full h-32 bg-gray-100 rounded-xl overflow-hidden relative border border-gray-200">
                    <iframe
                      width="100%" height="100%" frameBorder="0" scrolling="no"
                      src="https://www.openstreetmap.org/export/embed.html?bbox=80.34%2C7.47%2C80.38%2C7.50&layer=mapnik&marker=7.4818%2C80.3609"
                      style={{ filter: "saturate(0.7) opacity(0.8)" }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-5 bg-white" />
                  </div>
                )}

                {/* GPS Button */}
                <button
                  onClick={handleShareLocation}
                  disabled={isLocating}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 transition-all ${
                    locationCaptured
                      ? "bg-green-50 border-2 border-green-200 text-green-700"
                      : "text-white shadow-lg hover:opacity-90"
                  }`}
                  style={locationCaptured ? {} : { background: `linear-gradient(135deg, #1a1a1a, #333)` }}
                >
                  {isLocating ? (
                    <><div className="w-5 h-5 border-2 border-gray-300/40 border-t-gray-500 rounded-full animate-spin" /> Getting GPS location...</>
                  ) : locationCaptured ? (
                    <><CheckCircle2 size={18} /> Location Captured — Tap to Update</>
                  ) : (
                    <><Navigation size={18} /> Share Live Location</>
                  )}
                </button>

                {/* Captured coords badge */}
                {locationCaptured && customerCoords && (
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 bg-blue-50 rounded-xl px-3 py-2.5 border border-blue-100">
                    <MapPin size={12} className="text-blue-500 flex-shrink-0" />
                    <span>Your GPS: <b className="text-gray-600">{customerCoords.lat.toFixed(5)}, {customerCoords.lng.toFixed(5)}</b></span>
                  </div>
                )}
              </div>
            </section>

          </div>

          {/* ===== RIGHT COLUMN: Map + Order Total (2/5 width on desktop) ===== */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Route Map */}
            {locationCaptured && customerCoords && (
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50">
                    <Truck size={16} className="text-blue-600" />
                  </div>
                  <h2 className="font-bold text-gray-800 text-sm sm:text-base uppercase tracking-wider">Delivery Route</h2>
                </div>
                <div className="p-4">
                  {shopCoords ? (
                    <Suspense fallback={
                      <div className="bg-gray-50 rounded-xl h-64 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                      </div>
                    }>
                      <div className="rounded-xl overflow-hidden h-56 sm:h-72 lg:h-64">
                        <RouteMap
                          shopLat={shopCoords.lat}
                          shopLng={shopCoords.lng}
                          customerLat={customerCoords.lat}
                          customerLng={customerCoords.lng}
                          shopName={shopName}
                          onRouteCalculated={(km) => setRouteDistanceKm(km)}
                        />
                      </div>
                    </Suspense>
                  ) : (
                    <div className="bg-blue-50 rounded-xl p-5 text-center text-sm text-blue-500 border border-blue-100">
                      🗺️ Shop location not set yet. Route will appear once the seller marks their location.
                    </div>
                  )}

                  {/* Distance info */}
                  {routeDistanceKm !== null && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                      <Clock size={12} className="text-gray-400" />
                      <span>Distance: <b className="text-gray-700">{routeDistanceKm.toFixed(1)} km</b></span>
                      {routeDistanceKm > 4 && (
                        <span className="ml-auto text-gray-400">Base Rs.150 + {Math.ceil(routeDistanceKm - 4)}km × Rs.20</span>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Order Total Card */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-50">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${GREEN_LIGHT}22, ${GREEN_DARK}11)` }}>
                  <Receipt size={16} style={{ color: GREEN }} />
                </div>
                <h2 className="font-bold text-gray-800 text-sm sm:text-base uppercase tracking-wider">Payment Summary</h2>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Subtotal</span>
                  <span className="font-semibold text-gray-800">Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium flex items-center gap-1">
                    Delivery Fee
                    {routeDistanceKm !== null && (
                      <span className="text-[10px] text-blue-500 font-bold">({routeDistanceKm.toFixed(1)} km)</span>
                    )}
                  </span>
                  <span className="font-semibold text-gray-800">
                    {routeDistanceKm === null && locationCaptured && shopCoords ? (
                      <span className="text-xs text-gray-400 animate-pulse">Calculating...</span>
                    ) : (
                      `Rs. ${deliveryFee.toLocaleString()}`
                    )}
                  </span>
                </div>

                <div className="h-px bg-gray-100 my-1" />

                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900 text-base">Total</span>
                  <span className="font-black text-xl" style={{ color: GREEN }}>Rs. {total.toLocaleString()}</span>
                </div>

                {/* Place Order Button */}
                <button
                  onClick={handleBuyNow}
                  disabled={isPlacingOrder}
                  className="mt-2 w-full py-4 rounded-2xl text-white font-black text-base flex items-center justify-between px-6 shadow-xl hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-80"
                  style={{ background: `linear-gradient(135deg, ${GREEN_LIGHT}, ${GREEN_DARK})` }}
                >
                  <span className="flex flex-col items-start">
                    <span className="text-[9px] text-green-100 uppercase tracking-widest font-bold">Total Pay</span>
                    <span className="text-lg font-black">Rs. {total.toLocaleString()}</span>
                  </span>
                  {isPlacingOrder ? (
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Placing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 font-bold">LET&apos;S GO <ArrowRight size={18} /></span>
                  )}
                </button>
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="hidden sm:block bg-white border-t border-gray-200 mt-auto w-full">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="grid grid-cols-4 gap-8">
            <div>
              <img src="/login.png" alt="Vito Logo" className="h-12 w-auto object-contain mb-6 cursor-pointer" onClick={() => router.push("/home")} />
              <p className="text-gray-500 text-sm leading-relaxed">Your favorite local stores and restaurants, delivered fast and fresh.</p>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Quick Links</h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li className="hover:text-green-600 cursor-pointer transition-colors" onClick={() => router.push("/home")}>Home</li>
                <li className="hover:text-green-600 cursor-pointer transition-colors" onClick={() => router.push("/orders")}>My Orders</li>
                <li className="hover:text-green-600 cursor-pointer transition-colors" onClick={() => router.push("/profile")}>My Profile</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Partner with us</h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li className="hover:text-green-600 cursor-pointer transition-colors">Add your restaurant</li>
                <li className="hover:text-green-600 cursor-pointer transition-colors" onClick={() => window.location.href='/auth'}>Sign in to deliver</li>
                <li className="hover:text-green-600 cursor-pointer transition-colors" onClick={() => window.location.href='/riders'}>Details about riders</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Contact</h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li>Support Center</li>
                <li>info@vitodelivery.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 mt-12 pt-8 text-center text-sm text-gray-400">
            © 2026 Vito Delivery. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Full Screen Map Modal */}
      {isMapExpanded && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          <div className="p-4 flex items-center justify-between shadow-sm bg-white border-b border-gray-100">
            <h3 className="font-bold text-gray-800 text-lg">Delivery Route</h3>
            <button onClick={() => setIsMapExpanded(false)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          {locationCaptured && customerCoords && shopCoords && (
            <div className="flex-1">
              <Suspense fallback={<div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" /></div>}>
                <RouteMap
                  shopLat={shopCoords.lat} shopLng={shopCoords.lng}
                  customerLat={customerCoords.lat} customerLng={customerCoords.lng}
                  shopName={shopName}
                  onRouteCalculated={(km) => setRouteDistanceKm(km)}
                />
              </Suspense>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
