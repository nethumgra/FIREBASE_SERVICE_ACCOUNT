"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, Package, Plus, Minus, Home, ShoppingBag, Tag, User, Star, Send, X } from "lucide-react";
import { getProductById, getShopById, getReviewsByProduct, addReview, Product, Review } from "@/lib/db";
import { auth } from "@/lib/firebase";

const GREEN = "#2d6a2d";
const GREEN_LIGHT = "#348a34";

function StarRating({ value, onChange, size = 28 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button key={s} type="button" onClick={() => onChange?.(s)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          style={{ background: "none", border: "none", padding: 0 }}>
          <Star size={size} fill={s <= value ? "#f59e0b" : "none"} color={s <= value ? "#f59e0b" : "#d1d5db"} />
        </button>
      ))}
    </div>
  );
}

function ProductDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const productId = searchParams.get("id") as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVarName, setSelectedVarName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeNav, setActiveNav] = useState("home");
  const [shopName, setShopName] = useState("");
  const [isZoomed, setIsZoomed] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await getProductById(productId);
        setProduct(data);
        if (data?.variations && data.variations.length > 0) {
          setSelectedVarName(data.variations[0].name);
        }
        // Fetch shop name too
        if (data?.shopId) {
          getShopById(data.shopId).then(s => { if (s?.name) setShopName(s.name); }).catch(() => {});
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setIsLoading(false);
      }
    };
    const fetchReviews = async () => {
      try {
        const data = await getReviewsByProduct(productId);
        setReviews(data);
      } catch (e) { console.error(e); }
      finally { setReviewsLoading(false); }
    };
    fetchProduct();
    fetchReviews();
  }, [productId]);

  const getCartItemDetails = () => {
    if (!product) return null;
    let finalPrice = product.price;
    let finalName = product.name;
    let finalImage = product.imageUrl || "";
    let finalId = product.id;

    if (selectedVarName && product.variations) {
      const v = product.variations.find(x => x.name === selectedVarName);
      if (v) {
        finalPrice = Number(v.price) || product.price;
        finalName = `${product.name} - ${v.name}`;
        if (v.imageUrl) finalImage = v.imageUrl;
        finalId = `${product.id}_${v.name}`;
      }
    }
    // Calculate final delivery charge or use shop delivery fee logic if available. We fallback to 150.
    return { id: finalId, name: finalName, price: finalPrice, image: finalImage, qty: quantity, deliveryCharge: 150 };
  };

  const handleAddToCart = () => {
    const item = getCartItemDetails();
    if (!item) return;
    try {
      const raw = localStorage.getItem("loversmart_cart");
      let cartData: any = { items: [], shopId: product!.shopId || null, shopName: shopName || "" };
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          cartData = { items: parsed, shopId: product!.shopId || null, shopName: shopName || "" };
        } else {
          cartData = parsed;
          if (!cartData.items) cartData.items = [];
        }
      }
      if (!cartData.shopId && product!.shopId) cartData.shopId = product!.shopId;
      if (!cartData.shopName && shopName) cartData.shopName = shopName;
      const existing = cartData.items.find((i: any) => i.id === item.id);
      if (existing) { existing.qty += item.qty; }
      else { cartData.items.push(item); }
      localStorage.setItem("loversmart_cart", JSON.stringify(cartData));
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) { console.error(err); }
  };

  const handleBuyNow = () => {
    const item = getCartItemDetails();
    if (!item) return;
    try {
      const raw = localStorage.getItem("loversmart_cart");
      let cartData: any = { items: [], shopId: product!.shopId || null, shopName: shopName || "" };
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          cartData = { items: parsed, shopId: product!.shopId || null, shopName: shopName || "" };
        } else {
          cartData = { ...parsed, items: Array.isArray(parsed.items) ? parsed.items : [] };
        }
      }
      if (!cartData.shopId && product!.shopId) cartData.shopId = product!.shopId;
      if (!cartData.shopName && shopName) cartData.shopName = shopName;
      const existing = cartData.items.find((i: any) => i.id === item.id);
      if (existing) { existing.qty += item.qty; }
      else { cartData.items.push(item); }
      localStorage.setItem("loversmart_cart", JSON.stringify(cartData));
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) { console.error(err); }
    router.push("/checkout");
  };


  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const user = auth.currentUser;
      const userName = user?.displayName || user?.email?.split("@")[0] || "Anonymous";
      const userId = user?.uid || "guest_" + Date.now();
      await addReview({ productId, userId, userName, rating, comment: comment.trim() });
      setComment("");
      setRating(5);
      const updated = await getReviewsByProduct(productId);
      setReviews(updated);
    } catch (err: any) { alert(err.message || "Failed to submit review"); }
    finally { setSubmitting(false); }
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  if (isLoading) return (
    <div className="w-full max-w-md mx-auto min-h-dvh flex flex-col bg-white">
      <div className="w-full aspect-square bg-gray-100 animate-pulse" />
      <div className="flex-1 px-6 pt-6">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4 animate-pulse" />
        <div className="h-4 bg-gray-100 rounded w-full mb-2 animate-pulse" />
      </div>
    </div>
  );

  if (!product) return (
    <div className="w-full max-w-md mx-auto min-h-dvh flex flex-col items-center justify-center bg-white text-center">
      <Package size={48} className="text-gray-300 mb-4" />
      <h2 className="text-xl font-bold text-gray-800 mb-2">Product Not Found</h2>
      <button onClick={() => router.back()} className="px-6 py-2 bg-green-700 text-white font-bold rounded-xl shadow-sm">Go Back</button>
    </div>
  );

  let displayPrice = product?.price;
  let displayImage = product?.imageUrl || "";

  if (selectedVarName && product?.variations) {
    const selectedVar = product.variations.find(v => v.name === selectedVarName);
    if (selectedVar) {
      if (selectedVar.price !== undefined && selectedVar.price !== null) {
        displayPrice = Number(selectedVar.price);
      }
      if (selectedVar.imageUrl) {
        displayImage = selectedVar.imageUrl;
      }
    }
  }

  return (
    <div className="w-full min-h-dvh flex flex-col font-sans bg-white sm:bg-[#f5f6fa] relative sm:shadow-none pb-20 sm:pb-0">

      {/* ===== MOBILE BACK BUTTON ===== */}
      <div className="sm:hidden absolute top-0 left-0 w-full z-10 px-4 pt-10 pb-4 flex items-center"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)" }}>
        <button onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
          <ChevronLeft size={24} />
        </button>
      </div>

      {/* ===== DESKTOP HEADER ===== */}
      <header className="hidden sm:flex items-center justify-center z-50 sticky top-0 shadow-lg w-full" style={{ background: `linear-gradient(160deg, #1c3f1c 0%, #2d6a2d 100%)` }}>
        <div className="w-full max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img src="/login.png" alt="Vito Logo" className="h-8 w-auto object-contain cursor-pointer mr-2 drop-shadow-md" onClick={() => router.push('/home')} />
            <button onClick={() => router.back()} className="text-white bg-white/20 hover:bg-white/30 rounded-full p-2 transition-colors">
              <ChevronLeft size={24} />
            </button>
            <span className="text-white text-xl font-bold tracking-wide">{shopName || "Product Detail"}</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-full text-green-800 font-bold hover:bg-gray-100 transition-colors text-sm"
              onClick={() => router.push('/profile')}>
              <User size={18} /> Profile
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 w-full sm:max-w-5xl mx-auto sm:px-8 sm:py-8 flex flex-col sm:flex-row gap-0 sm:gap-12">

        {/* LEFT COL: Product Image */}
        <div className="w-full sm:w-[45%] lg:w-[50%] aspect-square sm:aspect-auto sm:h-[600px] bg-gray-100 flex items-center justify-center flex-shrink-0 sm:rounded-3xl overflow-hidden relative sm:shadow-md">
          {displayImage
            ? <img src={displayImage} alt={product.name} className="w-full h-full object-cover cursor-zoom-in active:opacity-90 transition-opacity hover:scale-105 duration-300" onClick={() => setIsZoomed(true)} />
            : <Package size={64} className="text-gray-300" />}
        </div>

        {/* RIGHT COL: Scrollable Content (Mobile) / Right Panel (Desktop) */}
        <div className="flex-1 px-6 pt-6 sm:px-0 sm:pt-0 bg-white sm:bg-transparent rounded-t-3xl -mt-6 sm:mt-0 relative z-10 flex flex-col">

        {/* Name + Price */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 leading-tight pr-4">{product.name}</h1>
            {product.amount && product.unit && product.unit !== "none" && (
              <span className="text-sm font-medium text-gray-500 mt-1 block">{product.amount}{product.unit === "kg" || product.unit === "g" || product.unit === "ml" || product.unit === "L" ? product.unit : ` ${product.unit}`}</span>
            )}
          </div>
          <span className="text-3xl font-normal whitespace-nowrap" style={{ color: GREEN }}>Rs. {displayPrice?.toLocaleString()}</span>
        </div>

        {/* Average Rating summary */}
        {avgRating && (
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} fill="#f59e0b" color="#f59e0b" />
            <span className="text-sm font-bold text-gray-700">{avgRating}</span>
            <span className="text-xs text-gray-400">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <p className="text-gray-500 text-sm leading-relaxed mb-6">{product.description}</p>
        )}

        {/* Variations */}
        {product.variations && product.variations.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Select Variation</h3>
            <div className="flex flex-wrap gap-2">
              {product.variations.map(v => (
                <button
                  key={v.name}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelectedVarName(v.name);
                  }}
                  className={`flex flex-col items-start px-4 py-2.5 rounded-xl border-2 transition-all ${
                    selectedVarName === v.name
                      ? "border-green-600 bg-green-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-green-200"
                  }`}
                >
                  <span className={`text-sm font-bold ${selectedVarName === v.name ? "text-green-800" : "text-gray-700"}`}>
                    {v.name}
                  </span>
                  <span className={`text-xs font-semibold ${selectedVarName === v.name ? "text-green-600" : "text-gray-500"}`}>
                    Rs. {v.price !== undefined && v.price !== null ? Number(v.price).toLocaleString() : (product.price?.toLocaleString() || 0)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantity + Buttons */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Quantity</span>
            <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-3 py-2">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm disabled:opacity-40"
                disabled={quantity <= 1}><Minus size={16} strokeWidth={3} /></button>
              <span className="w-8 text-center font-bold text-gray-900">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm">
                <Plus size={16} strokeWidth={3} /></button>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAddToCart}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm border-2 transition-all active:scale-95"
              style={{ borderColor: GREEN, color: GREEN, background: "white" }}>Add to Cart</button>
            <button onClick={handleBuyNow}
              className="flex-1 py-3.5 rounded-2xl font-bold text-sm text-white transition-all active:scale-95"
              style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_LIGHT})` }}>Buy Now</button>
          </div>
        </div>

        {/* ── Reviews Section ── */}
        <div className="border-t border-gray-100 pt-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 text-base">Reviews</h2>
            {avgRating && (
              <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full">
                <Star size={13} fill="#f59e0b" color="#f59e0b" />
                <span className="text-sm font-bold text-amber-600">{avgRating}</span>
              </div>
            )}
          </div>

          {/* Write a Review */}
          <form onSubmit={handleSubmitReview} className="bg-gray-50 rounded-2xl p-4 mb-5">
            <p className="text-xs font-bold text-gray-600 mb-2">Your Rating</p>
            <div className="mb-3">
              <StarRating value={rating} onChange={setRating} size={26} />
            </div>
            <div className="flex gap-2 items-end">
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Share your experience..."
                rows={2}
                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-600 resize-none"
                required
              />
              <button type="submit" disabled={submitting || !comment.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_LIGHT})` }}>
                <Send size={16} />
              </button>
            </div>
          </form>

          {/* Reviews List */}
          {reviewsLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <Star size={32} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm">No reviews yet. Be the first!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reviews.map(review => (
                <div key={review.id} className="bg-gray-50 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-800 text-xs font-bold">
                        {review.userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-bold text-gray-700">{review.userName}</span>
                    </div>
                    <StarRating value={review.rating} size={12} />
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed pl-9">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </main>

      {/* Zoomed Image Modal */}
      {isZoomed && displayImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center cursor-zoom-out backdrop-blur-sm"
          onClick={() => setIsZoomed(false)}
        >
          <div className="absolute top-6 right-6 z-[110]">
            <button className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors">
              <X size={24} />
            </button>
          </div>
          <img 
            src={displayImage} 
            alt={product.name} 
            className="w-full h-full max-h-[90vh] object-contain p-4" 
            onClick={(e) => e.stopPropagation()} // Prevent clicking image from closing if they want to zoom more later, but for now let's just close
          />
        </div>
      )}

      {/* ===== DESKTOP FOOTER ===== */}
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
                <li>info@vitodelivery.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-100 mt-12 pt-8 text-center text-sm text-gray-400">
            © 2026 Vito Delivery. All rights reserved.
          </div>
        </div>
      </footer>

      {/* ===== BOTTOM NAVIGATION (Mobile only) ===== */}
      <nav className="sm:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex items-center justify-around z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))", paddingTop: 6, height: 64 }}>
        {[
          { id: "home",    icon: <Home size={21} />,        label: "Home",    action: () => router.push("/home") },
          { id: "orders",  icon: <ShoppingBag size={21} />, label: "Orders",  action: () => {} },
          { id: "offers",  icon: <Tag size={21} />,         label: "Offers",  action: () => {} },
          { id: "profile", icon: <User size={21} />,        label: "Profile", action: () => {} },
        ].map(item => (
          <button key={item.id} onClick={() => { setActiveNav(item.id); item.action(); }}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all flex-1 border-none bg-transparent cursor-pointer"
            style={{ color: activeNav === item.id ? GREEN : "#9ca3af" }}>
            {item.icon}
            <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<div className="w-full min-h-dvh flex items-center justify-center">Loading...</div>}>
      <ProductDetailContent />
    </Suspense>
  );
}
