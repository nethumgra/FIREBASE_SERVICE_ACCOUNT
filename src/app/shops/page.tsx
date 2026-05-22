"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Search, ChevronLeft, Home, Package, Tag, User,
  Store, Clock, Box, X, MapPin, ChevronDown,
  Check, Loader2, Plus, ShoppingBag
} from "lucide-react";
import {
  getCategoryConfigs, getLocationsByDistrict,
  getAllProductsByCity, Product, CategoryConfig
} from "@/lib/db";
import { SRI_LANKA_DISTRICTS } from "@/lib/config";

const GREEN = "#2d6a2d";
const GREEN_DARK = "#1c4a1c";
const GREEN_LIGHT = "#348a34";

type BrowseProduct = Product & { shopName: string; shopImageUrl?: string };

export default function ShopsPage() {
  return (
    <Suspense fallback={null}>
      <ShopsPageInner />
    </Suspense>
  );
}

function ShopsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<BrowseProduct[]>([]);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    () => searchParams.get("category") || null
  );
  const [activeNav, setActiveNav] = useState("browse");
  const [selectedCity, setSelectedCity] = useState("Kurunegala");

  // Location picker state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [districtCities, setDistrictCities] = useState<string[]>([]);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);
  const [pendingCity, setPendingCity] = useState("");

  useEffect(() => {
    // Sync category from URL whenever searchParams changes
    const catParam = searchParams.get("category");
    if (catParam) setSelectedCategory(catParam);
  }, [searchParams]);

  useEffect(() => {
    const city = localStorage.getItem("vito_user_city") || "Kurunegala";
    setSelectedCity(city);
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [fetchedProducts, cats] = await Promise.all([
          getAllProductsByCity(city),
          getCategoryConfigs(),
        ]);
        setProducts(fetchedProducts);
        setCategories(cats);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDistrictChange = async (district: string) => {
    setSelectedDistrict(district);
    setPendingCity("");
    setDistrictCities([]);
    if (!district) return;
    setIsCitiesLoading(true);
    try {
      const locs = await getLocationsByDistrict(district);
      setDistrictCities(locs.map(l => l.city));
    } catch (e) { console.error(e); }
    finally { setIsCitiesLoading(false); }
  };

  const handleConfirmCity = async () => {
    if (!pendingCity) return;
    localStorage.setItem("vito_user_city", pendingCity);
    setSelectedCity(pendingCity);
    setShowLocationModal(false);
    setSelectedDistrict("");
    setDistrictCities([]);
    setPendingCity("");
    setIsLoading(true);
    try {
      const fetchedProducts = await getAllProductsByCity(pendingCity);
      setProducts(fetchedProducts);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (p.isAvailable === false) return false;
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.shopName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = !selectedCategory || p.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, searchQuery, selectedCategory]);

  const handleQuickAdd = (e: React.MouseEvent, product: BrowseProduct) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.variations && product.variations.length > 0) {
      router.push(`/product/${product.id}`);
      return;
    }
    try {
      const raw = localStorage.getItem("loversmart_cart");
      const cartData = raw ? JSON.parse(raw) : { items: [], shopId: product.shopId, shopName: product.shopName };
      if (!Array.isArray(cartData.items)) cartData.items = [];
      
      cartData.shopId = product.shopId;
      cartData.shopName = product.shopName;
      
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
          deliveryCharge: 0,
        });
      }
      localStorage.setItem("loversmart_cart", JSON.stringify(cartData));
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) {
      console.error("Cart error:", err);
    }
  };

  /* ---- Skeleton ---- */
  if (isLoading) {
    return (
      <div className="w-full min-h-dvh flex flex-col font-sans bg-[#f5f6fa] relative">
        <header
          className="hidden sm:flex items-center justify-center z-50 sticky top-0 shadow-lg w-full"
          style={{ background: `linear-gradient(160deg, ${GREEN_DARK} 0%, ${GREEN} 100%)` }}
        >
          <div className="w-full max-w-7xl mx-auto px-8 py-4 flex items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/20 animate-pulse" />
              <div className="h-6 w-24 bg-white/20 rounded animate-pulse" />
              <div className="h-8 w-32 bg-white/10 rounded-full animate-pulse" />
            </div>
            <div className="flex-1 max-w-xl">
              <div className="h-10 w-full bg-white/10 rounded-full animate-pulse" />
            </div>
            <div className="h-10 w-28 bg-white rounded-full animate-pulse" />
          </div>
        </header>

        <div className="sm:hidden sticky top-0 z-50" style={{ background: `linear-gradient(160deg, ${GREEN_DARK} 0%, ${GREEN} 100%)` }}>
          <div className="flex items-center gap-3 px-4 pt-10 pb-3">
            <div className="w-9 h-9 rounded-full bg-white/20 animate-pulse" />
            <div className="h-5 w-28 bg-white/20 rounded animate-pulse" />
          </div>
          <div className="px-4 pb-4">
            <div className="h-12 w-full bg-white rounded-xl animate-pulse" />
          </div>
        </div>

        <div className="flex-1 w-full xl:max-w-7xl mx-auto px-4 sm:px-8 py-6">
          <div className="flex gap-4 sm:gap-6 mb-8 overflow-x-auto no-scrollbar">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-200 animate-pulse" />
                <div className="h-2.5 w-12 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
            {[1,2,3,4,5,6,7,8,9,10].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <div className="aspect-square bg-gray-100 animate-pulse" />
                <div className="p-3 flex flex-col gap-2">
                  <div className="h-3 rounded w-3/4 bg-gray-200 animate-pulse" />
                  <div className="h-2.5 rounded w-1/2 bg-gray-200 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-dvh flex flex-col font-sans bg-[#f5f6fa] relative pb-20 sm:pb-0">

      <header
        className="hidden sm:flex items-center justify-center z-50 sticky top-0 shadow-lg w-full"
        style={{ background: `linear-gradient(160deg, ${GREEN_DARK} 0%, ${GREEN} 100%)` }}
      >
        <div className="w-full max-w-7xl mx-auto px-8 py-4 flex items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/home")}
              className="text-white bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
            <span className="text-white text-xl font-bold tracking-wide">Shop</span>
            <button
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-white text-sm font-semibold transition-colors"
            >
              <MapPin size={15} /> {selectedCity} <ChevronDown size={14} className="text-white/70" />
            </button>
          </div>

          <div className="flex-1 max-w-xl relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              type="text"
              placeholder="Search items or shops..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-full pl-11 pr-10 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-shadow"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
                <X size={16} />
              </button>
            )}
          </div>

          <button
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-full text-green-800 font-bold hover:bg-gray-100 transition-colors text-sm"
            onClick={() => router.push("/profile")}
          >
            <User size={18} /> Profile
          </button>
        </div>
      </header>

      <div
        className="sm:hidden sticky top-0 z-50"
        style={{ background: `linear-gradient(160deg, ${GREEN_DARK} 0%, ${GREEN} 100%)` }}
      >
        <div className="flex items-center justify-between px-4 pt-10 pb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/home")}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white"
            >
              <ChevronLeft size={22} />
            </button>
            <span className="text-white text-lg font-bold tracking-wide">Shop</span>
          </div>
          <button
            onClick={() => setShowLocationModal(true)}
            className="flex items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full text-white text-sm font-semibold"
          >
            <MapPin size={13} /> {selectedCity}
          </button>
        </div>
        <div className="px-4 pb-4 pt-2">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white rounded-xl pl-9 pr-9 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none shadow-lg"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 w-full xl:max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <div className="overflow-hidden relative group">
          <div className={`flex gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-4 mb-6 pt-2 sm:flex-nowrap ${!isLoading && categories.length > 0 ? 'sm:animate-marquee sm:gap-12' : ''}`}>
            <button
              onClick={() => setSelectedCategory(null)}
              className="flex flex-col items-center gap-2 flex-shrink-0 group/item"
            >
              <div 
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex items-center justify-center shadow-sm border-2 transition-all group-hover/item:scale-105 ${
                  !selectedCategory ? "border-green-600 shadow-md" : "border-transparent bg-white"
                }`}
              >
                <div className={`w-full h-full flex items-center justify-center ${!selectedCategory ? 'text-green-600' : 'text-gray-400'}`}>
                  <Store size={24} />
                </div>
              </div>
              <span className={`text-[11px] font-bold transition-colors ${!selectedCategory ? "text-green-700" : "text-gray-500"}`}>
                All
              </span>
            </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className="flex flex-col items-center gap-2 flex-shrink-0 group"
            >
              <div 
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex items-center justify-center shadow-sm border-2 transition-all group-hover:scale-105 ${
                  selectedCategory === cat.id ? "border-green-600 shadow-md" : "border-transparent bg-white"
                }`}
              >
                {cat.imageUrl ? (
                  <img src={cat.imageUrl} alt={cat.label} className="w-full h-full object-cover" />
                ) : (
                  <Box size={24} className={selectedCategory === cat.id ? "text-green-600" : "text-gray-400"} />
                )}
              </div>
              <span className={`text-[11px] font-bold transition-colors ${selectedCategory === cat.id ? "text-green-700" : "text-gray-500"}`}>
                {cat.label}
              </span>
            </button>
          ))}
            {/* Duplicate Set for Marquee */}
            <button
              key="all-clone"
              onClick={() => setSelectedCategory(null)}
              className="hidden sm:flex flex-col items-center gap-2 flex-shrink-0 group/item"
            >
              <div 
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex items-center justify-center shadow-sm border-2 transition-all group-hover/item:scale-105 ${
                  !selectedCategory ? "border-green-600 shadow-md" : "border-transparent bg-white"
                }`}
              >
                <div className={`w-full h-full flex items-center justify-center ${!selectedCategory ? 'text-green-600' : 'text-gray-400'}`}>
                  <Store size={24} />
                </div>
              </div>
              <span className={`text-[11px] font-bold transition-colors ${!selectedCategory ? "text-green-700" : "text-gray-500"}`}>
                All
              </span>
            </button>
            {categories.map((cat) => (
              <button
                key={`${cat.id}-clone`}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className="hidden sm:flex flex-col items-center gap-2 flex-shrink-0 group/item"
              >
                <div 
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden flex items-center justify-center shadow-sm border-2 transition-all group-hover/item:scale-105 ${
                    selectedCategory === cat.id ? "border-green-600 shadow-md" : "border-transparent bg-white"
                  }`}
                >
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} alt={cat.label} className="w-full h-full object-cover" />
                  ) : (
                    <Box size={24} className={selectedCategory === cat.id ? "text-green-600" : "text-gray-400"} />
                  )}
                </div>
                <span className={`text-[11px] font-bold transition-colors ${selectedCategory === cat.id ? "text-green-700" : "text-gray-500"}`}>
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-base sm:text-xl">
            {searchQuery
              ? `Results for "${searchQuery}"`
              : selectedCategory
              ? `${categories.find(c => c.id === selectedCategory)?.label} Items`
              : "All Items"}
          </h2>
          <span className="text-sm text-gray-400 font-medium">{filtered.length} items</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-3 text-gray-300">
            <ShoppingBag size={52} />
            <p className="text-base font-semibold text-gray-400">No items found</p>
            <p className="text-sm text-gray-400">Try a different search or category</p>
            {(searchQuery || selectedCategory) && (
              <button
                onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}
                className="mt-2 text-sm font-bold text-green-700 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5 pb-6">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={handleQuickAdd} />
            ))}
          </div>
        )}
      </main>

      <footer className="hidden sm:block bg-white border-t border-gray-200 mt-auto w-full">
        <div className="max-w-7xl mx-auto px-8 py-12">
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
                <li>hello@vitodelivery.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 mt-12 pt-8 text-center text-sm text-gray-400">
            © 2026 Vito Delivery. All rights reserved.
          </div>
        </div>
      </footer>

      <nav
        className="sm:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex items-center justify-around z-50"
        style={{ boxShadow: "0 -4px 24px rgba(0,0,0,0.08)", paddingBottom: "max(12px, env(safe-area-inset-bottom))", paddingTop: 8 }}
      >
        <NavBtn id="home" label="Home" active={activeNav === "home"} onClick={() => { setActiveNav("home"); router.push("/home"); }}>
          <Home size={22} />
        </NavBtn>
        <NavBtn id="browse" label="Items" active={activeNav === "browse"} onClick={() => { setActiveNav("browse"); router.push("/shops"); }}>
          <Tag size={22} />
        </NavBtn>
        <div className="flex justify-center items-end flex-1" style={{ paddingBottom: 4 }}>
          <button
            aria-label="Shop"
            className="w-14 h-14 rounded-full text-white flex items-center justify-center border-4 border-white"
            style={{ background: `linear-gradient(145deg, ${GREEN_LIGHT}, ${GREEN_DARK})`, transform: "translateY(-18px)" }}
          >
            <Store size={26} strokeWidth={2.5} />
          </button>
        </div>
        <NavBtn id="orders" label="Orders" active={activeNav === "orders"} onClick={() => { setActiveNav("orders"); router.push("/orders"); }}>
          <Package size={22} />
        </NavBtn>
        <NavBtn id="profile" label="Profile" active={activeNav === "profile"} onClick={() => { setActiveNav("profile"); router.push("/profile"); }}>
          <User size={22} />
        </NavBtn>
      </nav>

      {showLocationModal && (
        <div
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => { setShowLocationModal(false); setSelectedDistrict(""); setDistrictCities([]); setPendingCity(""); }}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl pb-10 animate-slide-up overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${GREEN_DARK}, ${GREEN})` }}>
                  <MapPin size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Change Location</h3>
                  <p className="text-xs text-gray-400">Select district then city</p>
                </div>
              </div>
              <button
                onClick={() => { setShowLocationModal(false); setSelectedDistrict(""); setDistrictCities([]); setPendingCity(""); }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-6 pt-5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">1. Select District</label>
              <div className="relative">
                <select
                  value={selectedDistrict}
                  onChange={e => handleDistrictChange(e.target.value)}
                  className="w-full appearance-none bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3.5 pr-10 text-sm font-semibold text-gray-800 focus:outline-none focus:border-green-600 transition-colors"
                >
                  <option value="">-- District Select කරන්න --</option>
                  {SRI_LANKA_DISTRICTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {selectedDistrict && (
              <div className="px-6 pt-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">2. City Select කරන්න</label>
                {isCitiesLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-sm font-medium">Loading cities...</span>
                  </div>
                ) : districtCities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-400 font-medium">No cities added yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                    {districtCities.map(city => (
                      <button
                        key={city}
                        onClick={() => setPendingCity(city)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                          pendingCity === city
                            ? "border-green-600 bg-green-50 text-green-800"
                            : "border-gray-100 bg-gray-50 text-gray-700 hover:border-green-200"
                        }`}
                      >
                        <span>{city}</span>
                        {pendingCity === city && <Check size={16} className="text-green-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="px-6 pt-5">
              <button
                onClick={handleConfirmCity}
                disabled={!pendingCity}
                className="w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: `linear-gradient(135deg, ${GREEN_LIGHT}, ${GREEN_DARK})` }}
              >
                {pendingCity ? <><Check size={18} /> {pendingCity} Select කරන්න</> : <>City Select කරන්න</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Product Card ---- */
function ProductCard({ product, onAdd }: { product: BrowseProduct; onAdd: (e: React.MouseEvent, p: BrowseProduct) => void }) {
  return (
    <div className="group cursor-pointer relative">
      <div style={{
        background: "#ffffff", borderRadius: "1.25rem", overflow: "hidden",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column",
        transition: "box-shadow 0.3s ease, transform 0.3s ease",
      }} className="group-hover:-translate-y-0.5 group-hover:shadow-xl">
        
        {/* Photo */}
        <a href={`/product/${product.id}`} className="block relative w-full aspect-square overflow-hidden bg-[#f5f5f5]">
          <span style={{ position: "absolute", top: "0.6rem", left: "0.6rem", background: "#18b06a", color: "#fff", fontSize: "8px", fontWeight: 900, padding: "2px 6px", borderRadius: "5px", zIndex: 10 }}>NEW</span>
          <img src={product.imageUrl || "/placeholder.jpg"} alt={product.name}
            className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105" />
        </a>

        {/* Info */}
        <div className="p-2 flex-1 flex flex-col justify-between bg-white">
          <a href={`/product/${product.id}`} style={{ textDecoration: "none" }}>
            <h3 style={{ fontSize: "11.5px", fontWeight: 600, color: "#1a1a1a", margin: "0 0 2px", lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {product.name}
            </h3>
            <p style={{ fontSize: "10px", color: "#9ca3af", margin: "0 0 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {product.shopName}
            </p>
          </a>
          <div className="flex items-end justify-between mt-auto pt-1">
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#111" }}>
              Rs. {product.price.toLocaleString()}
            </span>
            <button
              onClick={(e) => onAdd(e, product)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
              style={{ background: "linear-gradient(135deg, #2d6a2d, #348a34)" }}
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
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
