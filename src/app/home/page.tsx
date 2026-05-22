"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search, MapPin, Bell, ShoppingBag, Star, Clock, Bike,
  Home, Package, Store, ChevronDown, Navigation, Tag, User,
  Pizza, ShoppingCart, Pill, Croissant, CupSoda, Shirt, Smartphone, Box, Plus, X, Menu, ChevronRight, Check, Loader2
} from "lucide-react";
import { getShopsByCity, getBanners, getCategoryConfigs, Shop, Banner, CategoryConfig, getLocationsByDistrict } from "@/lib/db";
import { SRI_LANKA_DISTRICTS } from "@/lib/config";

const GREEN = "#2d6a2d";
const GREEN_DARK = "#1c4a1c";
const GREEN_LIGHT = "#348a34";

export default function CustomerHomePage() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState("Kurunegala");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeNav, setActiveNav] = useState("home");
  const [shops, setShops] = useState<Shop[]>([]);
  const [topBanners, setTopBanners] = useState<Banner[]>([]);
  const [middleBanner, setMiddleBanner] = useState<Banner | null>(null);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlusModal, setShowPlusModal] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [catPage, setCatPage] = useState(0);
  // Touch state
  const [bannerTouchX, setBannerTouchX] = useState<number | null>(null);
  const [catTouchX, setCatTouchX] = useState<number | null>(null);

  // Location picker state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [districtCities, setDistrictCities] = useState<string[]>([]);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);
  const [pendingCity, setPendingCity] = useState("");

  useEffect(() => {
    const savedCity = localStorage.getItem("vito_user_city") || "Kurunegala";
    setSelectedCity(savedCity);
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [fetchedShops, fetchedTop, fetchedMiddle, fetchedCats] = await Promise.all([
          getShopsByCity(savedCity),
          getBanners(true, "home_top"),
          getBanners(true, "home_middle"),
          getCategoryConfigs(),
        ]);
        setShops(fetchedShops);
        setTopBanners(fetchedTop);
        setMiddleBanner(fetchedMiddle[0] ?? null);
        setCategories(fetchedCats);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    };
    fetchData();
  }, []);

  // Auto-slide banners on mobile
  useEffect(() => {
    if (topBanners.length < 2) return;
    const timer = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % topBanners.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [topBanners.length]);

  // Auto-slide categories on mobile (page by page)
  useEffect(() => {
    if (categories.length === 0) return;
    const ITEMS_PER_PAGE = 4;
    const totalPages = Math.ceil(categories.length / ITEMS_PER_PAGE);
    if (totalPages <= 1) return;
    const timer = setInterval(() => {
      setCatPage(prev => (prev + 1) % totalPages);
    }, 3000);
    return () => clearInterval(timer);
  }, [categories.length]);

  // When district changes, load cities for that district from Firestore
  const handleDistrictChange = async (district: string) => {
    setSelectedDistrict(district);
    setPendingCity("");
    setDistrictCities([]);
    if (!district) return;
    setIsCitiesLoading(true);
    try {
      const locs = await getLocationsByDistrict(district);
      setDistrictCities(locs.map(l => l.city));
    } catch (e) {
      console.error(e);
    } finally {
      setIsCitiesLoading(false);
    }
  };

  // Confirm selected city and reload shops
  const handleConfirmCity = async () => {
    if (!pendingCity) return;
    localStorage.setItem("vito_user_city", pendingCity);
    setSelectedCity(pendingCity);
    setShowLocationModal(false);
    setSelectedDistrict("");
    setDistrictCities([]);
    setPendingCity("");
    // Reload shops for new city
    setIsLoading(true);
    try {
      const fetchedShops = await getShopsByCity(pendingCity);
      setShops(fetchedShops);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredShops = shops.filter(shop => {
    const matchCat = !selectedCategory || shop.category === selectedCategory;
    const matchSearch = !searchQuery || shop.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  if (isLoading) {
    return (
      <div className="w-full min-h-dvh flex flex-col font-sans bg-[#f5f6fa] relative sm:shadow-none">

        {/* Desktop Skeleton Header */}
        <header className="hidden sm:flex items-center justify-center z-50 sticky top-0 shadow-lg w-full" style={{ background: `linear-gradient(160deg, ${GREEN_DARK} 0%, ${GREEN} 100%)` }}>
          <div className="w-full max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
            <div className="h-10 w-32 bg-white/20 rounded animate-pulse"></div>
            <div className="flex-1 max-w-xl px-12">
              <div className="h-10 w-full bg-white/10 rounded-full animate-pulse"></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-white/20 rounded-full animate-pulse"></div>
              <div className="h-10 w-24 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
        </header>

        {/* Mobile Skeleton Header */}
        <div className="w-full max-w-md mx-auto sm:hidden sticky top-0 z-50">
          <header className="pt-8 pb-4" style={{ background: `linear-gradient(160deg, ${GREEN_DARK} 0%, ${GREEN} 100%)` }}>
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="h-5 w-32 bg-white/20 rounded animate-pulse"></div>
              <div className="h-9 w-9 bg-white/20 rounded-full animate-pulse"></div>
            </div>
            <div className="px-4">
              <div className="h-12 w-full bg-white rounded-xl animate-pulse shadow-sm"></div>
            </div>
          </header>
        </div>

        <div className="flex-1 overflow-y-auto pb-24 sm:pb-12 sm:pt-6 w-full xl:max-w-7xl mx-auto px-0 sm:px-4">
          <div className="px-4 sm:px-8 mt-4">
            <div className="h-40 sm:h-72 w-full bg-gray-200 rounded-2xl sm:rounded-3xl animate-pulse mb-6"></div>
          </div>

          <div className="px-4 sm:px-8 mb-8">
            <div className="h-6 w-32 bg-gray-200 rounded mb-4 animate-pulse"></div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-200 animate-pulse" />
                  <div className="h-2.5 w-12 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 sm:px-8">
            <div className="h-6 w-24 bg-gray-200 rounded mb-4 animate-pulse"></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
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
      </div>
    );
  }

  return (
    <div className="w-full min-h-dvh flex flex-col font-sans bg-[#f5f6fa] relative sm:shadow-none">

      {/* ===== DESKTOP HEADER (Full Width) ===== */}
      <header className="hidden sm:flex items-center justify-center z-50 sticky top-0 shadow-lg w-full" style={{ background: `linear-gradient(160deg, ${GREEN_DARK} 0%, ${GREEN} 100%)` }}>
        <div className="w-full max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img src="/logo.png" alt="Vito Logo" className="h-10 w-auto object-contain cursor-pointer" onClick={() => router.push('/home')} />
            <div 
              className="flex items-center gap-2 cursor-pointer bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
              onClick={() => setShowLocationModal(true)}
            >
              <MapPin size={18} />
              <span className="font-semibold text-sm">{selectedCity}</span>
              <ChevronDown size={16} className="text-white/70" />
            </div>
          </div>

          <div className="flex-1 max-w-xl px-12">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60" />
              <input
                type="text"
                placeholder="Search for restaurants, groceries, shops..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-full pl-11 pr-4 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 transition-shadow"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors font-medium text-sm"
              onClick={() => router.push('/shops')}
            >
              <Store size={18} /> All Shops
            </button>
            <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-green-700" />
            </button>
            <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-full text-green-800 font-bold hover:bg-gray-100 transition-colors text-sm"
              onClick={() => router.push('/profile')}>
              <User size={18} /> Profile
            </button>
          </div>
        </div>
      </header>

      {/* ===== MOBILE GREEN HEADER (Hidden on Desktop) ===== */}
      <div className="w-full max-w-md mx-auto sm:hidden sticky top-0 z-50">
        <header className="pt-8 pb-0" style={{ background: `linear-gradient(160deg, ${GREEN_DARK} 0%, ${GREEN} 100%)` }}>
          {/* Deliver to row */}
          <div className="flex items-center justify-between px-4 pb-3">
            <div>
              <p className="text-white/60 text-[11px] font-medium">Deliver to</p>
              <button onClick={() => setShowLocationModal(true)} className="flex items-center gap-1 mt-0.5 active:opacity-70 transition-opacity">
                <span className="text-white font-bold text-base">{selectedCity}</span>
                <ChevronDown size={16} className="text-white/80" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white relative">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-400 rounded-full border border-white" />
              </button>
              <button onClick={() => setShowLocationModal(true)} className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white active:bg-white/30 transition-colors">
                <MapPin size={18} />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-4 pb-4">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search food, grocery, stores..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-white rounded-xl pl-9 pr-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none shadow-lg"
              />
            </div>
          </div>
        </header>
      </div>

      {/* ===== SCROLLABLE BODY ===== */}
      <main className="flex-1 overflow-y-auto pb-24 sm:pb-12 sm:pt-6 w-full xl:max-w-7xl mx-auto px-0 sm:px-4">

        {/* ===== Hero Banners Section ===== */}
        {isLoading ? (
          <div className="mx-4 sm:mx-8 mt-4 skeleton h-36 sm:h-72 rounded-2xl sm:rounded-3xl" />
        ) : topBanners.length > 0 ? (
          <>
            {/* Mobile: Touch-swipeable auto-sliding carousel */}
            <div className="sm:hidden px-4 mt-4 relative"
              onTouchStart={e => setBannerTouchX(e.touches[0].clientX)}
              onTouchEnd={e => {
                if (bannerTouchX === null) return;
                const diff = bannerTouchX - e.changedTouches[0].clientX;
                if (Math.abs(diff) > 40) {
                  setBannerIndex(prev =>
                    diff > 0
                      ? (prev + 1) % topBanners.length
                      : (prev - 1 + topBanners.length) % topBanners.length
                  );
                }
                setBannerTouchX(null);
              }}
            >
              <div className="overflow-hidden rounded-2xl shadow-md">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${bannerIndex * 100}%)` }}
                >
                  {topBanners.map((b, idx) => (
                    <div key={b.id} className="flex-shrink-0 w-full">
                      <img src={b.imageUrl} alt={`Promo ${idx + 1}`} className="w-full h-auto block" />
                    </div>
                  ))}
                </div>
              </div>
              {/* Dots indicator */}
              {topBanners.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-2">
                  {topBanners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setBannerIndex(idx)}
                      className={`rounded-full transition-all duration-300 ${
                        idx === bannerIndex
                          ? 'w-5 h-1.5 bg-green-600'
                          : 'w-1.5 h-1.5 bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
            {/* Desktop: Side-by-side grid */}
            <div className="hidden sm:grid sm:grid-cols-2 gap-6 px-8 mt-4">
              {topBanners.slice(0, 2).map((b, idx) => (
                <div key={b.id} className="rounded-3xl overflow-hidden shadow-lg transition-transform hover:scale-[1.01]">
                  <img src={b.imageUrl} alt={`Promo ${idx + 1}`} className="w-full h-auto block" />
                </div>
              ))}
            </div>
          </>
        ) : null}

        {/* ===== Popular Categories ===== */}
        <div className="mt-6 sm:mt-10">
          <div className="flex items-center justify-between px-4 sm:px-8 mb-4">
            <h2 className="font-bold text-gray-900 text-base sm:text-xl">Popular Categories</h2>
          </div>

          {/* Mobile: Page-by-page carousel with swipe */}
          {(() => {
            const ITEMS_PER_PAGE = 4;
            const pages = [];
            for (let i = 0; i < categories.length; i += ITEMS_PER_PAGE) {
              pages.push(categories.slice(i, i + ITEMS_PER_PAGE));
            }
            const totalPages = pages.length;
            return (
              <div className="sm:hidden relative"
                onTouchStart={e => setCatTouchX(e.touches[0].clientX)}
                onTouchEnd={e => {
                  if (catTouchX === null) return;
                  const diff = catTouchX - e.changedTouches[0].clientX;
                  if (Math.abs(diff) > 40) {
                    setCatPage(prev =>
                      diff > 0
                        ? (prev + 1) % totalPages
                        : (prev - 1 + totalPages) % totalPages
                    );
                  }
                  setCatTouchX(null);
                }}
              >
                <div className="overflow-hidden">
                  <div
                    className="flex transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${catPage * 100}%)` }}
                  >
                    {pages.map((page, pageIdx) => (
                      <div key={pageIdx} className="flex-shrink-0 w-full grid grid-cols-4 gap-2 px-4">
                        {page.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => router.push(`/shops?category=${cat.id}`)}
                            className="flex flex-col items-center gap-1.5 group/item"
                          >
                            <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center shadow-md border-2 border-transparent transition-all group-hover/item:border-green-400 bg-white">
                              {cat.imageUrl ? (
                                <img src={cat.imageUrl} alt={cat.label} className="w-full h-full object-cover" />
                              ) : (
                                <Box size={22} className="text-gray-400" />
                              )}
                            </div>
                            <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight">{cat.label}</span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                {/* Page dots */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-1.5 mt-3">
                    {pages.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCatPage(idx)}
                        className={`rounded-full transition-all duration-300 ${
                          idx === catPage ? 'w-5 h-1.5 bg-green-600' : 'w-1.5 h-1.5 bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Desktop: Smooth auto-scroll marquee */}
          <div className="hidden sm:block overflow-hidden relative group">
            <div className={`flex px-8 no-scrollbar pb-2 flex-nowrap ${!isLoading && categories.length > 0 ? 'animate-marquee gap-12' : 'gap-6'}`}>
              {isLoading ? (
                [1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div className="skeleton w-24 h-24 rounded-full" />
                    <div className="skeleton h-2.5 w-12 rounded" />
                  </div>
                ))
              ) : (
                <>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => router.push(`/shops?category=${cat.id}`)}
                      className="flex flex-col items-center gap-2 flex-shrink-0 group/item"
                    >
                      <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center shadow-md border-2 border-transparent transition-all group-hover/item:shadow-lg group-hover/item:scale-105 group-hover/item:border-green-400 bg-white">
                        {cat.imageUrl ? (
                          <img src={cat.imageUrl} alt={cat.label} className="w-full h-full object-cover" />
                        ) : (
                          <Box size={26} className="text-gray-400" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-gray-600 group-hover/item:text-green-700 transition-colors">{cat.label}</span>
                    </button>
                  ))}
                  {/* Duplicate for seamless loop */}
                  {categories.map(cat => (
                    <button
                      key={`${cat.id}-clone`}
                      onClick={() => router.push(`/shops?category=${cat.id}`)}
                      className="flex flex-col items-center gap-2 flex-shrink-0 group/item"
                    >
                      <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center shadow-md border-2 border-transparent transition-all group-hover/item:shadow-lg group-hover/item:scale-105 group-hover/item:border-green-400 bg-white">
                        {cat.imageUrl ? (
                          <img src={cat.imageUrl} alt={cat.label} className="w-full h-full object-cover" />
                        ) : (
                          <Box size={26} className="text-gray-400" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-gray-600 group-hover/item:text-green-700 transition-colors">{cat.label}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ===== Middle Banner (After Categories) ===== */}
        {!isLoading && middleBanner && (
          <div className="px-4 sm:px-8 mt-6 sm:mt-10">
            <div className="w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-md sm:shadow-lg">
              <img src={middleBanner.imageUrl} alt="Offer" className="w-full h-auto block" />
            </div>
          </div>
        )}

        {/* ===== Shops / Stores Section ===== */}
        <div className="mt-6 sm:mt-10 px-4 sm:px-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-base sm:text-xl">
              {selectedCategory
                ? `${categories.find(c => c.id === selectedCategory)?.label} Shops`
                : "All Stores"}
            </h2>
            {selectedCategory && (
              <button onClick={() => setSelectedCategory(null)} className="text-xs font-bold" style={{ color: GREEN }}>
                Clear
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  <div className="skeleton aspect-square" />
                  <div className="p-3 flex flex-col gap-2">
                    <div className="skeleton h-3 rounded w-3/4" />
                    <div className="skeleton h-2.5 rounded w-1/2" />
                    <div className="skeleton h-2.5 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-3 text-gray-400">
              <Store size={48} />
              <p className="font-semibold text-gray-500">No shops found</p>
              <p className="text-sm text-center">Try a different category or search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5 pb-4">
              {filteredShops.map(shop => <ShopCard key={shop.id} shop={shop} />)}
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
                <li className="hover:text-green-600 cursor-pointer transition-colors">Home</li>
                <li className="hover:text-green-600 cursor-pointer transition-colors">All Categories</li>
                <li className="hover:text-green-600 cursor-pointer transition-colors">Special Offers</li>
                <li className="hover:text-green-600 cursor-pointer transition-colors">My Profile</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Partner with us</h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li className="hover:text-green-600 cursor-pointer transition-colors">Add your restaurant</li>
                <li className="hover:text-green-600 cursor-pointer transition-colors" onClick={() => window.location.href='/auth'}>Sign in to deliver</li>
                <li className="hover:text-green-600 cursor-pointer transition-colors" onClick={() => window.location.href='/riders'}>Details about riders</li>
                <li className="hover:text-green-600 cursor-pointer transition-colors">Business Account</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Contact</h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li>Support Center</li>
                <li>hello@vitodelivery.com</li>
                <li>+94 77 123 4567</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 mt-12 pt-8 flex items-center justify-between text-sm text-gray-400">
            <p>&copy; 2026 Vito Delivery. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-gray-600 cursor-pointer">Privacy Policy</span>
              <span className="hover:text-gray-600 cursor-pointer">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>

      {/* ===== MOBILE BOTTOM NAVIGATION (Hidden on Desktop) ===== */}
      <div className="sm:hidden flex justify-center">
        <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 flex items-center justify-around z-40"
          style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.08)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', paddingTop: 8 }}>

          {/* Home */}
          <NavBtn id="home" label="Home" active={activeNav === "home"} onClick={() => setActiveNav("home")}>
            <Home size={22} />
          </NavBtn>
          {/* Browse Items */}
          <NavBtn id="browse" label="Items" active={activeNav === "browse"} onClick={() => { setActiveNav("browse"); router.push("/shops"); }}>
            <Tag size={22} />
          </NavBtn>
          {/* Center Shops Button */}
          <div className="flex justify-center items-end flex-1" style={{ paddingBottom: 4 }}>
            <button
              aria-label="All Shops"
              onClick={() => router.push('/shops')}
              className="w-14 h-14 rounded-full text-white flex items-center justify-center border-4 border-white shadow-lg active:scale-95 transition-transform"
              style={{
                background: `linear-gradient(145deg, ${GREEN_LIGHT}, ${GREEN_DARK})`,
                transform: 'translateY(-18px)',
              }}
            >
              <Store size={26} strokeWidth={2.5} />
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

      {/* ===== PLUS BUTTON MODAL ===== */}
      {/* ===== LOCATION PICKER MODAL ===== */}
      {showLocationModal && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => { setShowLocationModal(false); setSelectedDistrict(""); setDistrictCities([]); setPendingCity(""); }}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl pb-10 sm:pb-6 animate-slide-up overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Header */}
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

            {/* Step 1: District Select */}
            <div className="px-6 pt-5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">1. Select District</label>
              <div className="relative">
                <select
                  value={selectedDistrict}
                  onChange={e => handleDistrictChange(e.target.value)}
                  className="w-full appearance-none bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3.5 pr-10 text-sm font-semibold text-gray-800 focus:outline-none focus:border-green-600 transition-colors"
                >
                  <option value="">-- Select District --</option>
                  {SRI_LANKA_DISTRICTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Step 2: City List */}
            {selectedDistrict && (
              <div className="px-6 pt-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">2. Select City</label>
                {isCitiesLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-sm font-medium">Loading cities...</span>
                  </div>
                ) : districtCities.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin size={32} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-sm text-gray-400 font-medium">No cities added yet</p>
                    <p className="text-xs text-gray-300 mt-1">Please add cities in the Admin panel</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                    {districtCities.map(city => (
                      <button
                        key={city}
                        onClick={() => setPendingCity(city)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${pendingCity === city
                            ? 'border-green-600 bg-green-50 text-green-800'
                            : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-green-200 hover:bg-green-50/50'
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

            {/* Confirm Button */}
            <div className="px-6 pt-5">
              <button
                onClick={handleConfirmCity}
                disabled={!pendingCity}
                className="w-full py-4 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: `linear-gradient(135deg, ${GREEN_LIGHT}, ${GREEN_DARK})` }}
              >
                {pendingCity ? (
                  <><Check size={18} /> Select {pendingCity}</>
                ) : (
                  <>Select City</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPlusModal && (
        <div className="sm:hidden fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowPlusModal(false)}>
          <div className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-12 animate-slide-up"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">More Options</h3>
              <button onClick={() => setShowPlusModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <ModalActionBtn icon={<Tag size={24} />} label="Coupons" color="text-orange-500" bg="bg-orange-50" />
              <ModalActionBtn icon={<Star size={24} />} label="Favorites" color="text-yellow-500" bg="bg-yellow-50" />
              <ModalActionBtn icon={<Clock size={24} />} label="History" color="text-blue-500" bg="bg-blue-50" />
              <ModalActionBtn icon={<MapPin size={24} />} label="Addresses" color="text-purple-500" bg="bg-purple-50" />
              <ModalActionBtn icon={<Bell size={24} />} label="Alerts" color="text-red-500" bg="bg-red-50" />
              <ModalActionBtn icon={<Menu size={24} />} label="Menu" color="text-gray-600" bg="bg-gray-100" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Modal Action Button ---- */
function ModalActionBtn({ icon, label, color, bg }: { icon: React.ReactNode, label: string, color: string, bg: string }) {
  return (
    <button className="flex flex-col items-center gap-2 p-3 rounded-2xl active:scale-95 transition-transform">
      <div className={`w-14 h-14 rounded-2xl ${bg} ${color} flex items-center justify-center shadow-sm`}>
        {icon}
      </div>
      <span className="text-xs font-semibold text-gray-700">{label}</span>
    </button>
  );
}

/* ---- Nav Button ---- */
function NavBtn({ id, children, label, active, onClick }: {
  id: string; children: React.ReactNode; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all flex-1 border-none bg-transparent cursor-pointer"
      style={{ color: active ? '#2d6a2d' : '#9ca3af' }}>
      {children}
      <span className="text-[10px] font-semibold tracking-wide">{label}</span>
    </button>
  );
}

/* ---- Shop Card ---- */
function ShopCard({ shop }: { shop: Shop }) {
  const router = useRouter();
  return (
    <button onClick={() => router.push(`/shop?id=${shop.id}`)}
      className="bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm text-left active:scale-[0.98] transition-all hover:shadow-md w-full border border-gray-100 flex flex-col group">
      {/* Image */}
      <div className="relative aspect-square w-full bg-gray-50 flex items-center justify-center overflow-hidden">
        {shop.imageUrl
          ? <img src={shop.imageUrl} alt={shop.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          : <Store size={28} style={{ color: '#2d6a2d' }} />}
        {!shop.isOpen && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-[10px] font-bold bg-black/30 px-2 py-0.5 rounded-full">Closed</span>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="px-2 py-1.5">
        <p className="font-bold text-[12px] text-gray-900 truncate">{shop.name}</p>
        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-400">
          <Clock size={9} />
          <span>{shop.deliveryTime || "TBA"}</span>
        </div>
      </div>
    </button>
  );
}
