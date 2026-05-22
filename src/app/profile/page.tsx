"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, Package, Home, Tag, User, Plus, 
  MapPin, Phone, LogOut, Edit2, CheckCircle2,
  Search, ChevronDown, Bell, ShoppingBag, Clock, XCircle, Truck,
  Trash2, Minus, ArrowRight, HelpCircle, MessageSquare, Mail, ExternalLink,
  Send, Paperclip, MoreVertical, Smile, FileText, ChevronUp
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getUserProfile, updateUserProfile, getCustomerOrders, VitoUser, Order } from "@/lib/db";

const STATUS_CONFIG: Record<Order["status"], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:    { label: "Pending",    color: "#b45309", bg: "#fef3c7", icon: <Clock size={14} /> },
  confirmed:  { label: "Confirmed",  color: "#1d4ed8", bg: "#dbeafe", icon: <CheckCircle2 size={14} /> },
  preparing:  { label: "Preparing",  color: "#7c3aed", bg: "#ede9fe", icon: <Package size={14} /> },
  picked_up:  { label: "On the Way", color: "#0369a1", bg: "#e0f2fe", icon: <Truck size={14} /> },
  delivered:  { label: "Delivered",  color: "#15803d", bg: "#dcfce7", icon: <CheckCircle2 size={14} /> },
  cancelled:  { label: "Cancelled",  color: "#dc2626", bg: "#fee2e2", icon: <XCircle size={14} /> },
};

const GREEN = "#2d6a2d";
const GREEN_DARK = "#1c4a1c";

export default function ProfilePage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<VitoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("profile");
  
  // Header State
  const [selectedCity, setSelectedCity] = useState("Maho");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editAddress, setEditAddress] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Tabs State (For PC)
  const [activeTab, setActiveTab] = useState<"details" | "orders" | "cart" | "help" | "faq">("details");
  const [orders, setOrders] = useState<Order[]>([]);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { id: 1, text: "Hello! Welcome to Vito Support. How can we help you today?", sender: "agent", time: "03:15 PM" },
    { id: 2, text: "I'm having trouble with my recent order.", sender: "user", time: "03:16 PM" },
    { id: 3, text: "I'm sorry to hear that. Could you please provide your order ID? I'll look into it right away.", sender: "agent", time: "03:16 PM" },
  ]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === "orders" && userProfile && orders.length === 0) {
      setIsOrdersLoading(true);
      getCustomerOrders(userProfile.uid).then(data => {
        setOrders(data);
        setIsOrdersLoading(false);
      });
    }

    if (activeTab === "cart") {
      const loadCart = () => {
        try {
          const saved = localStorage.getItem("loversmart_cart");
          if (saved) {
            const parsed = JSON.parse(saved);
            setCartItems(Array.isArray(parsed) ? parsed : (parsed.items || []));
          }
        } catch (err) {
          console.error("Error loading cart:", err);
        }
      };
      loadCart();
      window.addEventListener("cart-updated", loadCart);
      return () => window.removeEventListener("cart-updated", loadCart);
    }
  }, [activeTab, userProfile]);

  useEffect(() => {
    // Attempt to load saved city for desktop header consistency
    const savedCity = localStorage.getItem("vito_user_city") || "Maho";
    setSelectedCity(savedCity);

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/auth"); return; }
      try {
        const data = await getUserProfile(user.uid);
        if (data) {
          setUserProfile(data);
          setEditAddress(data.address || "");
          setEditPhone(data.phone1 || "");
        }
      } catch (err) { 
        console.error(err); 
      } finally { 
        setIsLoading(false); 
      }
    });
    return () => unsub();
  }, [router]);

  const handleSaveDetails = async () => {
    if (!userProfile) return;
    setIsSaving(true);
    try {
      await updateUserProfile(userProfile.uid, {
        address: editAddress,
        phone1: editPhone
      });
      setUserProfile({ ...userProfile, address: editAddress, phone1: editPhone });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/auth");
  };

  const getDisplayName = () => {
    if (!userProfile) return "Customer";
    if (userProfile.name && userProfile.name !== "Customer") return userProfile.name;
    if (userProfile.email) {
      const parts = userProfile.email.split("@")[0].split(".")[0];
      return parts.charAt(0).toUpperCase() + parts.slice(1);
    }
    return "Customer";
  };

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(getDisplayName())}&background=2d6a2d&color=fff&size=128&bold=true`;

  const updateCartQty = (id: string, delta: number) => {
    const newItems = cartItems.map(item => {
      if (item.id === id) {
        return { ...item, qty: Math.max(0, item.qty + delta) };
      }
      return item;
    }).filter(item => item.qty > 0);
    
    saveToLocalStorage(newItems);
  };

  const removeCartItem = (id: string) => {
    const newItems = cartItems.filter(item => item.id !== id);
    saveToLocalStorage(newItems);
  };

  const saveToLocalStorage = (items: any[]) => {
    try {
      const raw = localStorage.getItem("loversmart_cart");
      const existing = raw ? JSON.parse(raw) : {};
      const cartObj = Array.isArray(existing)
        ? { items: items }
        : { ...existing, items: items };
      localStorage.setItem("loversmart_cart", JSON.stringify(cartObj));
      setCartItems(items);
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) {
      console.error("Failed to save cart", err);
    }
  };

  const cartSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMessage = {
      id: chatMessages.length + 1,
      text: chatInput,
      sender: "user" as const,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages([...chatMessages, newMessage]);
    setChatInput("");

    // Simple auto-reply
    setTimeout(() => {
      const reply = {
        id: chatMessages.length + 2,
        text: "Thanks for the message! Our team is reviewing your request and will get back to you in a moment.",
        sender: "agent" as const,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, reply]);
    }, 1500);
  };

  return (
    <div className="w-full min-h-dvh flex flex-col font-sans bg-[#f5f6fa] relative sm:shadow-none">
      
      {/* ===== DESKTOP HEADER (Full Width) ===== */}
      <header className="hidden sm:flex items-center justify-center z-50 sticky top-0 shadow-lg w-full" style={{ background: `linear-gradient(160deg, ${GREEN_DARK} 0%, ${GREEN} 100%)` }}>
        <div className="w-full max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img src="/logo.png" alt="Vito Logo" className="h-10 w-auto object-contain cursor-pointer" onClick={() => router.push('/home')} />
            <div className="flex items-center gap-2 cursor-pointer bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors text-white">
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
            <button className="flex items-center gap-2 text-white/80 hover:text-white transition-colors font-medium text-sm">
              <Tag size={18} /> Offers
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

      {/* ===== MOBILE HEADER ===== */}
      {activeTab === 'details' && (
        <div className="w-full max-w-md mx-auto sm:hidden sticky top-0 z-50 shadow-md" style={{ background: `linear-gradient(160deg, ${GREEN_DARK} 0%, ${GREEN} 100%)` }}>
          <div className="flex items-center px-4 pt-10 pb-4">
            <button onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white mr-3 hover:bg-white/30 transition-colors">
              <ChevronLeft size={22} />
            </button>
            <div>
              <h1 className="text-white text-lg font-bold tracking-wide">My Profile</h1>
              <p className="text-green-100 text-xs">{isLoading ? "Loading..." : getDisplayName()}</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== SCROLLABLE BODY ===== */}
      <main className="flex-1 overflow-y-auto pb-24 sm:pb-12 w-full max-w-7xl mx-auto px-4 sm:px-8 mt-4 sm:mt-10">
        
        {isLoading ? (
          <div className="animate-pulse grid grid-cols-1 sm:grid-cols-12 gap-6">
            <div className="sm:col-span-4 lg:col-span-3 h-64 bg-white rounded-3xl" />
            <div className="sm:col-span-8 lg:col-span-9 h-96 bg-white rounded-3xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
            
            {/* Left Sidebar (Profile Info & Quick Actions) */}
            <div className="sm:col-span-5 lg:col-span-4 flex flex-col gap-6">
              {/* Profile Card */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex items-center gap-6">
                <div className="w-20 h-20 rounded-full overflow-hidden shadow-md border-4 border-white ring-1 ring-gray-100 flex-shrink-0">
                  <img 
                    src={avatarUrl} 
                    alt={getDisplayName()} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <h2 className="text-xl font-bold text-gray-900 truncate">{getDisplayName()}</h2>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{userProfile?.email}</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <button onClick={() => {
                    setActiveTab("details");
                  }}
                  className={`w-full flex items-center gap-4 px-6 py-4 transition-colors border-b border-gray-100 group ${activeTab === "details" ? "bg-gray-50 border-r-4 border-r-green-600" : "hover:bg-gray-50"}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${activeTab === "details" ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500 group-hover:scale-110"}`}>
                    <User size={20} />
                  </div>
                  <span className={`font-semibold ${activeTab === "details" ? "text-green-800" : "text-gray-700"}`}>My Details</span>
                </button>
                <button onClick={() => setActiveTab("orders")}
                  className={`w-full flex items-center gap-4 px-6 py-4 transition-colors border-b border-gray-100 group ${activeTab === "orders" ? "bg-gray-50 border-r-4 border-r-green-600" : "hover:bg-gray-50"}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${activeTab === "orders" ? "bg-green-50 text-green-700" : "bg-green-50 text-green-700 group-hover:scale-110"}`}>
                    <Package size={20} />
                  </div>
                  <span className={`font-semibold ${activeTab === "orders" ? "text-green-800" : "text-gray-700"}`}>My Orders</span>
                </button>
                <button onClick={() => setActiveTab("cart")}
                  className={`w-full flex items-center gap-4 px-6 py-4 transition-colors border-b border-gray-100 group ${activeTab === "cart" ? "bg-gray-50 border-r-4 border-r-green-600" : "hover:bg-gray-50"}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${activeTab === "cart" ? "bg-green-50 text-green-700" : "bg-green-50 text-green-700 group-hover:scale-110"}`}>
                    <ShoppingBag size={20} />
                  </div>
                  <span className={`font-semibold ${activeTab === "cart" ? "text-green-800" : "text-gray-700"}`}>My Cart</span>
                </button>
                <button onClick={() => setActiveTab("faq")}
                  className={`w-full flex items-center gap-4 px-6 py-4 transition-colors border-b border-gray-100 group ${activeTab === "faq" ? "bg-gray-50 border-r-4 border-r-green-600" : "hover:bg-gray-50"}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${activeTab === "faq" ? "bg-green-50 text-green-700" : "bg-green-50 text-green-700 group-hover:scale-110"}`}>
                    <FileText size={20} />
                  </div>
                  <span className={`font-semibold ${activeTab === "faq" ? "text-green-800" : "text-gray-700"}`}>F&Q</span>
                </button>
                <button onClick={() => setActiveTab("help")}
                  className={`w-full flex items-center gap-4 px-6 py-4 transition-colors border-b border-gray-100 group ${activeTab === "help" ? "bg-gray-50 border-r-4 border-r-green-600" : "hover:bg-gray-50"}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform ${activeTab === "help" ? "bg-green-50 text-green-700" : "bg-green-50 text-green-700 group-hover:scale-110"}`}>
                    <HelpCircle size={20} />
                  </div>
                  <span className={`font-semibold ${activeTab === "help" ? "text-green-800" : "text-gray-700"}`}>Help Center</span>
                </button>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-red-50 transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <LogOut size={20} />
                  </div>
                  <span className="font-semibold text-red-500">Log Out</span>
                </button>
              </div>
            </div>

            {/* Right Main Area */}
            <div className="sm:col-span-7 lg:col-span-8">
              {/* Inline Details View */}
              {activeTab === "details" && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8 sm:mb-0">
                  <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                    <h2 className="font-bold text-gray-800 text-sm sm:text-base uppercase tracking-wide flex items-center gap-2">
                      <User size={18} className="text-gray-400" /> My Details
                    </h2>
                    {!isEditing ? (
                      <button onClick={() => setIsEditing(true)} className="text-green-700 text-sm font-bold flex items-center gap-1.5 hover:text-green-800 transition-colors bg-green-50 px-3 py-1.5 rounded-full">
                        <Edit2 size={14} /> Edit
                      </button>
                    ) : (
                      <button onClick={() => setIsEditing(false)} className="text-gray-500 text-sm font-bold hover:text-gray-700 transition-colors bg-gray-100 px-3 py-1.5 rounded-full">
                        Cancel
                      </button>
                    )}
                  </div>
                  
                  <div className="p-6 sm:p-8 space-y-6">
                    {/* Email (Readonly) */}
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                      <p className="text-base font-medium text-gray-900">{userProfile?.email}</p>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-2">Phone Number</label>
                      {isEditing ? (
                        <div className="flex items-center bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 transition-colors focus-within:border-green-600">
                          <Phone size={18} className="text-gray-400 mr-3" />
                          <input 
                            type="tel" 
                            value={editPhone} 
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="bg-transparent border-none outline-none w-full text-base font-medium text-gray-900"
                            placeholder="e.g., +94 77 123 4567"
                          />
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center gap-3">
                          <Phone size={18} className="text-gray-400" />
                          <p className="text-base font-medium text-gray-900">{userProfile?.phone1 || "Not set"}</p>
                        </div>
                      )}
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-2">Delivery Address</label>
                      {isEditing ? (
                        <div className="flex items-start bg-white border-2 border-gray-200 rounded-2xl px-4 py-3 transition-colors focus-within:border-green-600">
                          <MapPin size={18} className="text-gray-400 mr-3 mt-0.5" />
                          <textarea 
                            value={editAddress} 
                            onChange={(e) => setEditAddress(e.target.value)}
                            className="bg-transparent border-none outline-none w-full text-base font-medium text-gray-900 resize-none h-24"
                            placeholder="Enter your full delivery address"
                          />
                        </div>
                      ) : (
                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-start gap-3">
                          <MapPin size={18} className="text-gray-400 mt-0.5 shrink-0" />
                          <p className="text-base font-medium text-gray-900 leading-relaxed">{userProfile?.address || "Not set"}</p>
                        </div>
                      )}
                    </div>

                    {isEditing && (
                      <button 
                        onClick={handleSaveDetails}
                        disabled={isSaving}
                        className="w-full sm:w-auto mt-6 px-8 py-3.5 rounded-2xl font-bold text-white shadow-lg flex justify-center items-center gap-2 disabled:opacity-70 hover:opacity-90 transition-opacity ml-auto"
                        style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})` }}>
                        {isSaving ? "Saving..." : <><CheckCircle2 size={20} /> Save Details</>}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Mobile Drawer Container for other tabs */}
              <div className={`
                fixed inset-x-0 top-0 z-[45] bg-[#f5f6fa] flex flex-col transition-transform duration-300 ease-in-out
                sm:relative sm:inset-auto sm:z-auto sm:bg-transparent sm:block sm:transition-none sm:transform-none
                ${activeTab !== 'details' ? 'translate-x-0 shadow-2xl sm:shadow-none' : 'translate-x-full sm:translate-x-0'}
                ${activeTab === 'help' ? 'bottom-0 !z-[100]' : 'bottom-[72px]'}
              `}>
                {/* Mobile Drawer Header */}
                {activeTab !== 'details' && (
                  <div className="sm:hidden px-4 py-4 flex items-center gap-3 border-b border-white/10 shadow-md flex-shrink-0 sticky top-0 z-10"
                    style={{ background: `linear-gradient(160deg, ${GREEN_DARK} 0%, ${GREEN} 100%)` }}>
                    <button onClick={() => setActiveTab('details')} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 active:scale-95 transition-all">
                      <ChevronLeft size={20} />
                    </button>
                    <h2 className="font-bold text-white text-lg">
                      {activeTab === 'orders' ? 'My Orders' : 
                       activeTab === 'cart' ? 'My Cart' : 
                       activeTab === 'faq' ? 'Frequently Asked Questions' : 
                       activeTab === 'help' ? 'Help Center' : ''}
                    </h2>
                  </div>
                )}
                
                <div className={`
                  ${activeTab !== 'details' ? 'flex-1 overflow-y-auto pb-24 sm:p-0 sm:pb-0 sm:overflow-visible' : 'hidden sm:block'}
                `}>
                  {activeTab === "orders" && (
                <div className="sm:bg-white sm:rounded-3xl sm:shadow-sm sm:border sm:border-gray-100 overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/30 hidden sm:flex items-center">
                    <h2 className="font-bold text-gray-800 text-sm sm:text-base uppercase tracking-wide flex items-center gap-2">
                      <Package size={18} className="text-gray-400" /> My Orders
                    </h2>
                  </div>
                  
                  <div className="p-6 sm:p-8 space-y-6 max-h-[600px] overflow-y-auto">
                    {isOrdersLoading ? (
                      <div className="flex flex-col gap-3">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="bg-gray-50 rounded-2xl p-4 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                            <div className="h-3 bg-gray-200 rounded w-3/4 mb-4" />
                            <div className="h-8 bg-gray-200 rounded w-1/3" />
                          </div>
                        ))}
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                          <ShoppingBag size={36} className="text-gray-300" />
                        </div>
                        <h2 className="text-gray-800 font-bold text-lg mb-1">No orders yet</h2>
                        <p className="text-gray-400 text-sm mb-6">Your orders will appear here once you place one.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {orders.map(order => {
                          const statusCfg = STATUS_CONFIG[order.status];
                          return (
                            <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md">
                              {/* Status bar */}
                              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50"
                                style={{ background: statusCfg.bg }}>
                                <span className="flex items-center gap-2 text-sm font-bold" style={{ color: statusCfg.color }}>
                                  {statusCfg.icon}
                                  {statusCfg.label}
                                </span>
                                <span className="text-xs text-gray-500 font-medium">
                                  {order.createdAt?.toDate?.().toLocaleDateString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) || "Just now"}
                                </span>
                              </div>

                              <div className="p-5">
                                {/* Shop name */}
                                <h3 className="font-bold text-gray-900 text-base mb-2">{order.shopName || "Shop"}</h3>

                                {/* Items */}
                                <div className="flex flex-col gap-1.5 mb-4 bg-gray-50 p-3 rounded-xl">
                                  {order.items.map((item, i) => (
                                    <p key={i} className="text-sm text-gray-600 flex justify-between">
                                      <span><span className="font-semibold">{item.quantity}×</span> {item.name}</span>
                                      <span className="text-gray-500 font-medium">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                                    </p>
                                  ))}
                                </div>

                                {/* Address */}
                                <div className="flex items-start gap-2 mb-4">
                                  <MapPin size={14} className="text-gray-400 mt-1 flex-shrink-0" />
                                  <p className="text-sm text-gray-500 leading-relaxed">{order.deliveryAddress}</p>
                                </div>

                                {/* Preparation Status & Time */}
                                {(order.status === "confirmed" || order.status === "preparing") && (order.preparationStatus || order.estimatedTime) && (
                                  <div className="flex items-center justify-between bg-blue-50/50 p-3 rounded-xl mb-4 border border-blue-50">
                                    {order.preparationStatus && (
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        <span className="text-sm font-bold text-blue-700">{order.preparationStatus}</span>
                                      </div>
                                    )}
                                    {(() => {
                                      if (!order.estimatedTime) return null;
                                      let remainingText = order.estimatedTime;
                                      if (order.updatedAt) {
                                        const match = order.estimatedTime.match(/(\d+)/);
                                        if (match) {
                                          const totalSeconds = parseInt(match[1]) * 60;
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
                                        <div className="text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-lg text-center">
                                          {remainingText === "Ready" ? "Ready" : remainingText}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}

                                {/* Total */}
                                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                                  <div>
                                    <p className="text-xs text-gray-400 font-medium">Delivery Fee</p>
                                    <p className="text-sm font-bold text-gray-700">Rs. {order.deliveryFee.toLocaleString()}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Total Amount</p>
                                    <p className="text-lg font-black text-[#2d6a2d]">Rs. {order.totalAmount.toLocaleString()}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === "cart" && (
                <div className="sm:bg-white sm:rounded-3xl sm:shadow-sm sm:border sm:border-gray-100 overflow-hidden flex flex-col">
                  <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/30 hidden sm:flex items-center">
                    <h2 className="font-bold text-gray-800 text-sm sm:text-base uppercase tracking-wide flex items-center gap-2">
                      <ShoppingBag size={18} className="text-[#2d6a2d]" /> My Cart
                    </h2>
                  </div>
                  
                  <div className="p-6 sm:p-8 space-y-4 max-h-[600px] overflow-y-auto">
                    {cartItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                          <ShoppingBag size={36} className="text-gray-300" />
                        </div>
                        <h2 className="text-gray-800 font-bold text-lg mb-1">Your cart is empty</h2>
                        <p className="text-gray-400 text-sm mb-6">Looks like you haven&apos;t added anything yet.</p>
                        <button onClick={() => router.push('/home')} 
                          className="bg-green-700 text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-green-800 transition-colors">
                          Go Shopping
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {cartItems.map(item => (
                          <div key={item.id} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 group">
                            <div className="w-16 h-16 rounded-xl bg-white overflow-hidden shadow-sm flex-shrink-0">
                              <img src={item.image || "/placeholder.jpg"} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 text-sm truncate">{item.name}</h4>
                              <p className="text-[#2d6a2d] font-black text-sm mt-0.5">Rs. {item.price.toLocaleString()}</p>
                            </div>

                            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-gray-100">
                              <button onClick={() => updateCartQty(item.id, -1)} 
                                className="text-gray-400 hover:text-red-500 transition-colors">
                                <Minus size={16} strokeWidth={2.5} />
                              </button>
                              <span className="font-bold text-sm w-4 text-center">{item.qty}</span>
                              <button onClick={() => updateCartQty(item.id, 1)} 
                                className="text-green-700 hover:text-green-800 transition-colors">
                                <Plus size={16} strokeWidth={2.5} />
                              </button>
                            </div>

                            <button onClick={() => removeCartItem(item.id)} 
                              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {cartItems.length > 0 && (
                    <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between mt-auto">
                      <div>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Subtotal</p>
                        <p className="text-xl font-black text-gray-900">Rs. {cartSubtotal.toLocaleString()}</p>
                      </div>
                      <button onClick={() => router.push('/checkout')} 
                        className="px-8 py-3 rounded-2xl text-white font-bold text-sm flex items-center gap-2 shadow-lg hover:opacity-90 transition-opacity"
                        style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_DARK})` }}>
                        Checkout <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "faq" && (
                <div className="sm:bg-white sm:rounded-3xl sm:shadow-sm sm:border sm:border-gray-100 overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/30 hidden sm:flex items-center">
                    <h2 className="font-bold text-gray-800 text-sm sm:text-base uppercase tracking-wide flex items-center gap-2">
                      <FileText size={18} className="text-[#2d6a2d]" /> Frequently Asked Questions
                    </h2>
                  </div>
                  <div className="p-6 sm:p-8">
                    <div className="space-y-4 max-w-3xl">
                      {[
                        { q: "How can I track my order?", a: "You can track your order in real-time by going to the 'My Orders' section. Once your order is confirmed, you will see live updates on its preparation and delivery status." },
                        { q: "What is the delivery fee?", a: "Delivery fees are calculated dynamically based on the distance between the shop and your delivery address. The exact fee is always displayed transparently before you checkout." },
                        { q: "Can I cancel my order?", a: "You can cancel your order within the first few minutes while it is in the 'Pending' state. Once the shop confirms it, cancellation is no longer possible." },
                        { q: "How do I update my delivery address?", a: "You can easily update your default delivery address in the 'My Details' section. Alternatively, you can add a new address during the checkout process." },
                        { q: "What should I do if an item is missing?", a: "We sincerely apologize for any inconvenience. Please reach out to our Help Center immediately with your Order ID, and our support team will resolve it for you." }
                      ].map((faq, index) => (
                        <div key={index} className="border border-gray-100 rounded-2xl overflow-hidden transition-all duration-300">
                          <button 
                            onClick={() => setOpenFaq(openFaq === index ? null : index)}
                            className={`w-full flex items-center justify-between p-5 text-left transition-colors ${openFaq === index ? 'bg-green-50/50' : 'bg-white hover:bg-gray-50/50'}`}
                          >
                            <span className={`font-bold text-sm ${openFaq === index ? 'text-green-800' : 'text-gray-800'}`}>{faq.q}</span>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${openFaq === index ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {openFaq === index ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </button>
                          <div 
                            className={`px-5 overflow-hidden transition-all duration-300 ease-in-out ${openFaq === index ? 'max-h-40 py-4 opacity-100 border-t border-green-50/50' : 'max-h-0 py-0 opacity-0'}`}
                          >
                            <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "help" && (
                <div className="bg-white sm:rounded-3xl sm:shadow-xl sm:border border-gray-100 overflow-hidden flex flex-col h-[calc(100dvh-73px)] sm:h-[650px]">
                  {/* Chat Header */}
                  <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700">
                          <User size={20} />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Vito Support Agent</h3>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          <span className="text-[11px] text-gray-400 font-medium">Online • Active now</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
                        <Phone size={18} />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
                    <div className="text-center mb-6">
                      <span className="px-3 py-1 bg-white text-[10px] text-gray-400 font-bold uppercase tracking-wider rounded-full shadow-sm border border-gray-100">Today</span>
                    </div>
                    
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                          <div className={`px-4 py-3 rounded-2xl text-sm font-medium shadow-sm ${
                            msg.sender === "user" 
                              ? "bg-green-700 text-white rounded-tr-none" 
                              : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                          }`}>
                            {msg.text}
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1 px-1 font-medium">{msg.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <div className="p-4 bg-white border-t border-gray-100">
                    <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                      <button type="button" className="p-2 text-gray-400 hover:text-green-700 transition-colors">
                        <Paperclip size={20} />
                      </button>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Type your message..."
                          className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all"
                        />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <Smile size={20} />
                        </button>
                      </div>
                      <button 
                        type="submit"
                        disabled={!chatInput.trim()}
                        className="w-11 h-11 bg-green-700 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-green-800 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                      >
                        <Send size={18} />
                      </button>
                    </form>
                  </div>
                </div>
              )}
              </div>
            </div>
            </div>

          </div>
        )}
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
                <li className="hover:text-green-600 cursor-pointer transition-colors">All Categories</li>
                <li className="hover:text-green-600 cursor-pointer transition-colors">Special Offers</li>
                <li className="hover:text-green-600 cursor-pointer transition-colors">My Profile</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Partner with us</h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li className="hover:text-green-600 cursor-pointer transition-colors" onClick={() => window.location.href='/riders'}>Details about riders</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Contact</h3>
              <ul className="space-y-3 text-sm text-gray-500">
                <li>Support Center</li>
                <li>info@vitodelivery.com</li>
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
        <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 flex items-center justify-around z-50"
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
          <NavBtn id="profile" label="Profile" active={activeNav === "profile"} onClick={() => { setActiveNav("profile"); }}>
            <User size={22} />
          </NavBtn>
        </nav>
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
