"use client";

import { useState, useEffect, useCallback } from "react";
import { ShoppingCart, X, Plus, Minus, Trash2, ArrowRight } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { Toaster } from "react-hot-toast";

interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  qty: number;
  deliveryCharge?: number;
}

export default function GlobalCart() {
  const [isOpen, setIsOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  const loadCart = useCallback(() => {
    try {
      const saved = localStorage.getItem("loversmart_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        setCart(Array.isArray(parsed) ? parsed : (parsed.items || []));
      } else {
        setCart([]);
      }
    } catch (err) {
      console.error("Error loading cart:", err);
    }
  }, []);

  useEffect(() => {
    loadCart();
    window.addEventListener("cart-updated", loadCart);
    return () => window.removeEventListener("cart-updated", loadCart);
  }, [loadCart]);

  const saveCart = (newCart: CartItem[]) => {
    try {
      const raw = localStorage.getItem("loversmart_cart");
      const existing = raw ? JSON.parse(raw) : {};
      const cartObj = Array.isArray(existing)
        ? { items: newCart }
        : { ...existing, items: newCart };
      localStorage.setItem("loversmart_cart", JSON.stringify(cartObj));
    } catch {
      localStorage.setItem("loversmart_cart", JSON.stringify({ items: newCart }));
    }
    setCart(newCart);
    window.dispatchEvent(new Event("cart-updated"));
  };

  const updateQty = (id: string, delta: number) => {
    const newCart = cart.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(item => item.qty > 0);
    saveCart(newCart);
  };

  const removeItem = (id: string) => {
    const newCart = cart.filter(item => item.id !== id);
    saveCart(newCart);
  };

  const itemCount = cart.reduce((total, item) => total + item.qty, 0);
  const subtotal = cart.reduce((total, item) => total + (item.price * item.qty), 0);

  const hideFloatingButton = pathname === '/checkout' || pathname.startsWith('/product/');

  return (
    <>
      <Toaster position="bottom-center" />
      {/* Floating Button */}
      {!hideFloatingButton && itemCount > 0 && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-4 bottom-24 z-[60] text-white p-3.5 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #2d6a2d, #348a34)' }}
        >
          <ShoppingCart size={24} />
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">
            {itemCount}
          </span>
        </button>
      )}

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-[100dvh] w-[85%] max-w-[360px] bg-white z-[70] shadow-2xl transition-transform duration-300 ease-out transform flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
            <ShoppingCart size={20} className="text-[#2d6a2d]" />
            Your Cart
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <ShoppingCart size={48} className="opacity-20" />
              <p className="font-medium text-sm">Your cart is empty</p>
              <button
                onClick={() => setIsOpen(false)}
                className="mt-2 text-[#2d6a2d] font-bold text-sm bg-[#e8f3e8] px-5 py-2.5 rounded-full"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-3 bg-white border border-gray-100 p-3 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] relative">
                <div className="w-[72px] h-[72px] rounded-xl bg-gray-50 overflow-hidden flex-shrink-0">
                  <img src={item.image || "/placeholder.jpg"} alt={item.name} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 flex flex-col justify-between py-0.5">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-[13px] font-bold text-gray-800 leading-tight line-clamp-2">{item.name}</h4>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors -mt-0.5"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-end justify-between mt-1">
                    <p className="text-[#2d6a2d] font-black text-sm">Rs. {item.price.toLocaleString()}</p>

                    <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                      <button
                        onClick={() => updateQty(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center bg-white rounded-md text-gray-600 shadow-sm active:scale-95 transition-transform"
                      >
                        <Minus size={12} strokeWidth={2.5} />
                      </button>
                      <span className="text-[12px] font-bold w-4 text-center">{item.qty}</span>
                      <button
                        onClick={() => updateQty(item.id, 1)}
                        className="w-6 h-6 flex items-center justify-center bg-[#2d6a2d] rounded-md text-white shadow-sm active:scale-95 transition-transform"
                      >
                        <Plus size={12} strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-4 bg-white border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 font-medium text-sm">Subtotal</span>
              <span className="text-[19px] font-black text-gray-900">Rs. {subtotal.toLocaleString()}</span>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                router.push('/checkout'); // Optional
              }}
              className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all"
              style={{ background: 'linear-gradient(135deg, #2d6a2d, #1c4a1c)' }}
            >
              Checkout <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
