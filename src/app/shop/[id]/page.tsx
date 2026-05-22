"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Star, Clock, Bike, Store, Package, Plus,
  ShoppingBag, Home, Heart, User, ShoppingCart, Tag
} from "lucide-react";
import { getShopById, getProductsByShop, getCategoryConfigs, Shop, Product, CategoryConfig } from "@/lib/db";

export default function ShopDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("home");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [shopData, productData, catData] = await Promise.all([
          getShopById(params.id),
          getProductsByShop(params.id),
          getCategoryConfigs()
        ]);
        setShop(shopData);
        setProducts(productData);
        setCategories(catData);
      } catch (err) { console.error(err); }
      finally { setIsLoading(false); }
    };
    fetchData();
  }, [params.id]);

  const greenGrad = { background: 'linear-gradient(135deg, #2d6a2d, #348a34)' };

  /* ---- Skeleton State ---- */
  if (isLoading) {
    return (
      <div className="w-full min-h-dvh flex flex-col font-sans bg-white sm:bg-[#f5f6fa] relative sm:shadow-none pb-20 sm:pb-0">
        
        {/* Desktop Skeleton Header */}
        <header className="hidden sm:flex items-center justify-center z-50 sticky top-0 shadow-lg w-full" style={{ background: `linear-gradient(160deg, #1c3f1c 0%, #2d6a2d 100%)` }}>
          <div className="w-full max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-10 h-10 rounded-full bg-white/20 animate-pulse" />
              <div className="h-7 w-48 bg-white/20 rounded animate-pulse"></div>
            </div>
            <div className="h-10 w-28 bg-white rounded-full animate-pulse"></div>
          </div>
        </header>

        {/* Mobile Skeleton Header */}
        <div className="flex sm:hidden items-center px-4 pt-10 pb-4 sticky top-0 z-50 w-full max-w-md mx-auto" style={{ background: `linear-gradient(160deg, #1c3f1c 0%, #2d6a2d 100%)` }}>
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white mr-3 animate-pulse" />
          <div className="h-5 rounded w-32 bg-white/20 animate-pulse" />
        </div>

        <div className="flex-1 overflow-y-auto sm:pb-12 sm:pt-6 w-full xl:max-w-7xl mx-auto px-0 sm:px-4">
          {/* Banner skeleton */}
          <div className="px-4 pt-4">
            <div className="rounded-2xl w-full bg-gray-200 animate-pulse aspect-[16/8] sm:aspect-[21/9] md:aspect-[24/9] lg:aspect-[32/9]" />
          </div>
          {/* Products skeleton */}
          <div className="px-4 mt-6">
            <div className="h-4 w-24 rounded mb-4 bg-gray-200 animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} className="rounded-2xl overflow-hidden pb-2 bg-white shadow-sm border border-gray-100">
                  <div className="aspect-square bg-gray-100 animate-pulse" />
                  <div className="px-2 pt-2.5 pb-2 flex flex-col gap-2">
                    <div className="h-3 rounded w-3/4 bg-gray-200 animate-pulse" />
                    <div className="h-2.5 rounded w-1/2 bg-gray-200 animate-pulse" />
                    <div className="flex justify-between items-center mt-2">
                      <div className="h-3 rounded w-10 bg-gray-200 animate-pulse" />
                      <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="w-full min-h-dvh flex flex-col font-sans bg-[#f5f6fa] relative sm:shadow-none items-center justify-center">
        <Store size={56} className="text-gray-300 mb-4" />
        <p className="text-gray-500 font-semibold">Shop not found</p>
        <button onClick={() => router.back()} className="mt-4 text-green-700 font-bold text-sm">← Go back</button>
      </div>
    );
  }

  const deliveryFee = shop.deliveryFee ?? null;

  // Filter products by category
  let availableProducts = products.filter(p => p.isAvailable !== false);
  if (selectedCategory !== "all") {
    availableProducts = availableProducts.filter(p => p.category === selectedCategory || (selectedCategory === "uncategorized" && !p.category));
  }

  // Get used categories
  const usedCategoryIds = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  const usedCategories = categories.filter(c => usedCategoryIds.includes(c.id));
  const hasUncategorized = products.some(p => !p.category);

  return (
    <div className="w-full min-h-dvh flex flex-col font-sans bg-white sm:bg-[#f5f6fa] relative sm:shadow-none pb-20 sm:pb-0">

      {/* ===== DESKTOP HEADER (Full Width) ===== */}
      <header className="hidden sm:flex items-center justify-center z-50 sticky top-0 shadow-lg w-full" style={{ background: `linear-gradient(160deg, #1c3f1c 0%, #2d6a2d 100%)` }}>
        <div className="w-full max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={() => router.back()} className="text-white bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors">
              <ChevronLeft size={24} />
            </button>
            <span className="text-white text-xl font-bold tracking-wide">{shop.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-full text-green-800 font-bold hover:bg-gray-100 transition-colors text-sm"
              onClick={() => router.push('/profile')}>
              <User size={18} /> Profile
            </button>
          </div>
        </div>
      </header>

      {/* ===== MOBILE GREEN HEADER (Hidden on Desktop) ===== */}
      <div className="flex sm:hidden items-center px-4 pt-10 pb-4 sticky top-0 z-50 w-full max-w-md mx-auto" style={{ background: `linear-gradient(160deg, #1c3f1c 0%, #2d6a2d 100%)` }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white mr-3">
          <ChevronLeft size={22} />
        </button>
        <span className="text-white text-lg font-bold tracking-wide truncate">{shop.name}</span>
      </div>

      {/* ===== SCROLLABLE BODY ===== */}
      <main className="flex-1 overflow-y-auto sm:pb-12 sm:pt-6 w-full xl:max-w-7xl mx-auto px-0 sm:px-4">
        {/* Banner */}
        {shop.bannerUrl && (
          <div className="px-4 pt-4">
            <div className="rounded-2xl overflow-hidden shadow-md bg-gray-50">
              <img src={shop.bannerUrl} alt={shop.name} className="w-full h-auto block" />
            </div>
          </div>
        )}

        {/* Shop Description */}
        {shop.description && (
          <div className="px-4 pt-4 pb-1 text-center">
            <p className="text-[13px] text-gray-500 leading-relaxed font-medium">{shop.description}</p>
          </div>
        )}

        {/* Categories Horizontal Scroll */}
        {(usedCategories.length > 0 || hasUncategorized) && (
          <div className="px-4 mt-4 pb-2">
            <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`flex items-center justify-center whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                  selectedCategory === "all" ? "bg-green-50 border-green-600 text-green-700 shadow-sm" : "bg-white border-transparent text-gray-500 hover:bg-gray-50 shadow-sm"
                }`}
              >
                All
              </button>
              {usedCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center justify-center whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                    selectedCategory === cat.id ? "bg-green-50 border-green-600 text-green-700 shadow-sm" : "bg-white border-transparent text-gray-500 hover:bg-gray-50 shadow-sm"
                  }`}
                >
                  {cat.emoji && <span className="mr-1.5">{cat.emoji}</span>}
                  {cat.label}
                </button>
              ))}
              {hasUncategorized && (
                <button
                  onClick={() => setSelectedCategory("uncategorized")}
                  className={`flex items-center justify-center whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                    selectedCategory === "uncategorized" ? "bg-green-50 border-green-600 text-green-700 shadow-sm" : "bg-white border-transparent text-gray-500 hover:bg-gray-50 shadow-sm"
                  }`}
                >
                  Other
                </button>
              )}
            </div>
          </div>
        )}

        {/* Products */}
        <div className="px-4 mt-2 pb-6">

          {availableProducts.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-3 text-gray-300">
              <ShoppingBag size={44} />
              <p className="text-sm font-semibold text-gray-400">No products yet</p>
              <p className="text-xs text-gray-400">Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
              {availableProducts.map(product => {
                const discount = 14; // Mock discount for UI
                const oldPrice = Math.round(product.price / (1 - discount / 100));
                const hasDiscount = discount > 0;
                const isSoldOut = product.isAvailable === false;
                const isNew = true; // Mock for UI
                const isLowStock = false; // Mock for UI
                
                const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (product.variations && product.variations.length > 0) {
                    router.push(`/product/${product.id}`);
                    return;
                  }
                  try {
                    const raw = localStorage.getItem("loversmart_cart");
                    const cartData = raw ? JSON.parse(raw) : { items: [], shopId: shop.id, shopName: shop.name };
                    if (!Array.isArray(cartData.items)) cartData.items = [];
                    // Always keep shopId + shopName in sync
                    cartData.shopId = shop.id;
                    cartData.shopName = shop.name;
                    const existingIndex = cartData.items.findIndex((item: any) => item.id === product.id);
                    if (existingIndex > -1) {
                      cartData.items[existingIndex].qty += 1;
                    } else {
                      cartData.items.push({
                        id: product.id,
                        name: product.name,
                        price: product.price || 0,
                        image: product.imageUrl || "",
                        qty: 1,
                        deliveryCharge: shop.deliveryFee || 0,
                      });
                    }
                    localStorage.setItem("loversmart_cart", JSON.stringify(cartData));
                    window.dispatchEvent(new Event("cart-updated"));
                  } catch (err) {
                    console.error("Cart error:", err);
                  }
                };
                
                return (
                  <div key={product.id} className="group cursor-pointer relative" style={{ opacity: isSoldOut ? 0.72 : 1 }}>
                    <div style={{
                      background: "#ffffff", borderRadius: "1.25rem", overflow: "hidden",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                      transition: "box-shadow 0.3s ease, transform 0.3s ease",
                      display: "flex", flexDirection: "column",
                    }} className={!isSoldOut ? "group-hover:-translate-y-0.5 group-hover:shadow-xl" : ""}>

                      {/* PHOTO */}
                      <Link href={isSoldOut ? "#" : `/product/${product.id}`}
                        onClick={isSoldOut ? (e) => e.preventDefault() : undefined}
                        className="block relative w-full aspect-square overflow-hidden bg-[#f5f5f5]">

                        {/* Badges */}
                        <div style={{ position: "absolute", top: "0.6rem", left: "0.6rem", zIndex: 10, display: "flex", flexDirection: "column", gap: "3px" }}>
                          {hasDiscount && !isSoldOut && (
                            <span style={{ background: "#111", color: "#fff", fontSize: "8px", fontWeight: 900, padding: "2px 6px", borderRadius: "5px" }}>-{discount}%</span>
                          )}
                          {isNew && !isSoldOut && (
                            <span style={{ background: "#18b06a", color: "#fff", fontSize: "8px", fontWeight: 900, padding: "2px 6px", borderRadius: "5px" }}>NEW</span>
                          )}
                          {isLowStock && (
                            <span style={{ background: "#f59e0b", color: "#fff", fontSize: "8px", fontWeight: 900, padding: "2px 6px", borderRadius: "5px" }}>Left!</span>
                          )}
                          {isSoldOut && (
                            <span style={{ background: "#222", color: "#fff", fontSize: "8px", fontWeight: 900, padding: "2px 8px", borderRadius: "5px" }}>Sold Out</span>
                          )}
                        </div>

                        {/* Product image */}
                        <img src={product.imageUrl || "/placeholder.jpg"} alt={product.name}
                          className={`absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 ${!isSoldOut ? "group-hover:scale-105" : ""}`}
                          style={{ filter: isSoldOut ? "grayscale(30%)" : "none" }} />

                      </Link>

                      {/* INFO */}
                      <div className="p-2 flex-1 flex flex-col justify-between bg-white">
                        <Link href={isSoldOut ? "#" : `/product/${product.id}`}
                          onClick={isSoldOut ? (e) => e.preventDefault() : undefined}
                          style={{ textDecoration: "none" }}>
                          <h3 style={{
                            fontSize: "11.5px", fontWeight: 600, color: isSoldOut ? "#aaa" : "#1a1a1a",
                            margin: "0 0 2px", lineHeight: 1.3,
                            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                          }}>
                            {product.name}
                          </h3>
                          {product.amount && product.unit && product.unit !== "none" && (
                            <span style={{ fontSize: "10px", fontWeight: 600, color: "#888", display: "block", marginBottom: "4px" }}>
                              {product.amount}{product.unit === "kg" || product.unit === "g" || product.unit === "ml" || product.unit === "L" ? product.unit : ` ${product.unit}`}
                            </span>
                          )}
                        </Link>
                        <div className="flex items-end justify-between mt-auto pt-1">
                          <span style={{ fontSize: "13px", fontWeight: 700, color: isSoldOut ? "#aaa" : "#111" }}>
                            Rs. {product.price.toLocaleString()}
                          </span>
                          {!isSoldOut && (
                            <button
                              onClick={(e) => handleQuickAdd(e, product)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
                              style={greenGrad}
                            >
                              <Plus size={16} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
              )})}
            </div>
          )}
        </div>
      </main>

      {/* ===== DESKTOP FOOTER (Full Width) ===== */}
      <footer className="hidden sm:block bg-white border-t border-gray-200 mt-auto w-full">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="grid grid-cols-4 gap-8">
            <div>
              <img src="/login.png" alt="Vito Logo" className="h-12 w-auto object-contain mb-6 cursor-pointer" onClick={() => router.push('/home')} />
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                Your favorite local stores and restaurants, delivered fast and fresh right to your doorstep.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-green-50 transition-colors">
                  <span className="font-bold text-gray-600">fb</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center cursor-pointer hover:bg-green-50 transition-colors">
                  <span className="font-bold text-gray-600">ig</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Quick Links</h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li className="hover:text-green-600 cursor-pointer transition-colors" onClick={() => router.push('/home')}>Home</li>
                <li className="hover:text-green-600 cursor-pointer transition-colors" onClick={() => router.push('/profile')}>My Profile</li>
                <li className="hover:text-green-600 cursor-pointer transition-colors" onClick={() => router.push('/orders')}>Orders</li>
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
                <li>hello@vitodelivery.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 mt-12 pt-8 text-center text-sm text-gray-400">
            © 2026 Vito Delivery. All rights reserved.
          </div>
        </div>
      </footer>

      {/* ===== BOTTOM NAVIGATION (Mobile only) ===== */}
      <nav className="sm:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex items-center justify-around z-50"
        style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.08)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', paddingTop: 8 }}>

        {/* Home */}
        <NavBtn id="home" label="Home" active={activeNav === "home"} onClick={() => { setActiveNav("home"); router.push("/home"); }}>
          <Home size={22} />
        </NavBtn>
        {/* Orders */}
        <NavBtn id="orders" label="Orders" active={activeNav === "orders"} onClick={() => { setActiveNav("orders"); router.push("/orders"); }}>
          <Package size={22} />
        </NavBtn>
        {/* Center Cart */}
        <div className="flex justify-center items-end flex-1" style={{ paddingBottom: 4 }}>
          <button
            aria-label="Cart"
            onClick={() => {
              const currentShopCart = localStorage.getItem("loversmart_cart");
              if (currentShopCart) {
                // If cart exists, let's open it (it's handled by GlobalCart)
                window.dispatchEvent(new Event("cart-updated"));
              }
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
        {/* Offers */}
        <NavBtn id="offers" label="Offers" active={activeNav === "offers"} onClick={() => setActiveNav("offers")}>
          <Tag size={22} />
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
