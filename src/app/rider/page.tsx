"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getCurrentUserProfile } from "@/lib/auth";
import { getOrdersByCity, Order, updateOrderStatus, VitoUser } from "@/lib/db";
import { LogOut, MapPin, Package, Truck, CheckCircle2, Clock, Map, RefreshCw, User, History, ChevronRight, Phone, CreditCard, Calendar, Home } from "lucide-react";

export default function RiderDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<VitoUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState("orders");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }
      try {
        const p = await getCurrentUserProfile();
        if (p?.role !== "delivery") {
          router.push("/home");
          return;
        }
        setProfile(p);
        await loadOrders(p.city);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  const loadOrders = async (city: string) => {
    try {
      const allOrders = await getOrdersByCity(city);
      setOrders(allOrders);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefresh = async () => {
    if (!profile || isRefreshing) return;
    setIsRefreshing(true);
    await loadOrders(profile.city);
    setIsRefreshing(false);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: Order["status"]) => {
    try {
      await updateOrderStatus(orderId, newStatus, profile?.uid);
      if (profile) await loadOrders(profile.city);
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/auth");
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid #bbf7d0', borderTopColor: '#16a34a', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#16a34a', fontWeight: 600 }}>Loading Rider App...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  const activeOrders = orders.filter(o => o.status !== "delivered" && o.status !== "cancelled");
  const historyOrders = orders.filter(o => (o.status === "delivered" || o.status === "cancelled") && o.deliveryBoyId === profile?.uid);

  const statusColor = (status: string) => {
    switch (status) {
      case 'pending': return { bg: '#fef9c3', text: '#a16207', border: '#fde047' };
      case 'confirmed': return { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' };
      case 'preparing': return { bg: '#f3e8ff', text: '#7c3aed', border: '#c4b5fd' };
      case 'picked_up': return { bg: '#d1fae5', text: '#059669', border: '#6ee7b7' };
      default: return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
    }
  };

  const navItems = [
    { id: "orders", label: "Orders", icon: <Package size={20} />, badge: activeOrders.length },
    { id: "history", label: "History", icon: <History size={20} /> },
    { id: "profile", label: "Profile", icon: <User size={20} /> },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafb', display: 'flex' }}>

      {/* ===== SIDEBAR (Desktop) ===== */}
      <aside style={{
        width: 260, background: 'linear-gradient(180deg, #14532d 0%, #166534 100%)',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
      }} className="rider-sidebar">
        {/* Logo area */}
        <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 44, height: 44, background: 'rgba(255,255,255,0.15)',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Truck size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: '0.5px' }}>Rider App</h1>
              <p style={{ color: '#86efac', fontSize: 11, margin: 0, fontWeight: 500 }}>Vito Delivery</p>
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <User size={16} color="#86efac" />
            </div>
            <div>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{profile?.name}</p>
              <p style={{ color: '#86efac', fontSize: 11, margin: 0 }}>{profile?.city} &bull; Online</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                borderRadius: 12, border: 'none', cursor: 'pointer', marginBottom: 4, transition: 'all 0.2s',
                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
              }}>
                {item.icon}
                <span style={{ fontSize: 14, fontWeight: isActive ? 700 : 500, flex: 1, textAlign: 'left' }}>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span style={{
                    background: '#22c55e', color: '#fff', fontSize: 11, fontWeight: 700,
                    padding: '2px 8px', borderRadius: 10, minWidth: 20, textAlign: 'center'
                  }}>{item.badge}</span>
                )}
                <ChevronRight size={14} style={{ opacity: isActive ? 1 : 0.4 }} />
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button onClick={handleLogout} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
            borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.15)',
            color: '#fca5a5', transition: 'all 0.2s', fontSize: 14, fontWeight: 600,
          }}>
            <LogOut size={18} /> Log Out
          </button>
        </div>
      </aside>

      {/* ===== MOBILE HEADER ===== */}
      <div className="rider-mobile-header" style={{
        background: 'linear-gradient(160deg, #14532d 0%, #166534 100%)',
        padding: '48px 16px 16px', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        display: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, background: 'rgba(255,255,255,0.15)',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Truck size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ color: '#fff', fontSize: 17, fontWeight: 800, margin: 0 }}>Rider App</h1>
              <p style={{ color: '#86efac', fontSize: 11, margin: 0 }}>{profile?.city} &bull; Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main className="rider-main" style={{ flex: 1, marginLeft: 260, minHeight: '100vh' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 32px 100px' }}>

          {/* Page title bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#111827', margin: 0 }}>
                {activeTab === 'orders' ? 'Active Deliveries' : activeTab === 'history' ? 'Delivery History' : 'My Profile'}
              </h2>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
                {activeTab === 'orders' ? `${activeOrders.length} order${activeOrders.length !== 1 ? 's' : ''} in ${profile?.city}` :
                 activeTab === 'history' ? `${historyOrders.length} completed deliver${historyOrders.length !== 1 ? 'ies' : 'y'}` :
                 profile?.email}
              </p>
            </div>
            {activeTab === 'orders' && (
              <button onClick={handleRefresh} disabled={isRefreshing} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                borderRadius: 12, border: '2px solid #d1d5db', background: '#fff', color: '#374151',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}>
                <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            )}
          </div>

          {/* ORDERS TAB */}
          {activeTab === "orders" && (
            <>
              {activeOrders.length === 0 ? (
                <div style={{
                  background: '#fff', borderRadius: 20, padding: '60px 40px', textAlign: 'center',
                  border: '2px dashed #e5e7eb', maxWidth: 500, margin: '40px auto'
                }}>
                  <div style={{
                    width: 72, height: 72, background: '#f0fdf4', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
                  }}>
                    <Package size={32} color="#86efac" />
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: 18, color: '#111827', margin: '0 0 8px' }}>No Active Orders</h3>
                  <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
                    There are no orders to deliver in your city right now. Take a break!
                  </p>
                  <button onClick={handleRefresh} style={{
                    background: '#16a34a', color: '#fff', border: 'none', padding: '12px 28px',
                    borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 8
                  }}>
                    <RefreshCw size={16} /> Refresh Orders
                  </button>
                </div>
              ) : (
                <div className="rider-orders-grid">
                  {activeOrders.map(order => {
                    const isMine = order.deliveryBoyId === profile?.uid;
                    const hasDeliveryBoy = !!order.deliveryBoyId;
                    const sc = statusColor(order.status);

                    return (
                      <div key={order.id} style={{
                        background: '#fff', borderRadius: 16, overflow: 'hidden',
                        border: '1px solid #e5e7eb', transition: 'box-shadow 0.2s, transform 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                      >
                        {/* Card header */}
                        <div style={{
                          padding: '14px 18px', borderBottom: '1px solid #f3f4f6',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          background: '#fafbfc'
                        }}>
                          <div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.5px' }}>
                              ORDER #{order.id.slice(-6).toUpperCase()}
                            </span>
                            <div style={{ marginTop: 4 }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                                background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                                textTransform: 'uppercase', letterSpacing: '0.3px'
                              }}>
                                {order.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>Fee</p>
                            <p style={{ fontSize: 18, fontWeight: 800, color: '#16a34a', margin: 0 }}>Rs. {order.deliveryFee}</p>
                          </div>
                        </div>

                        {/* Card body */}
                        <div style={{ padding: 18 }}>
                          {/* Route */}
                          <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
                              <MapPin size={15} color="#9ca3af" />
                              <div style={{ width: 2, height: 28, background: '#e5e7eb', margin: '4px 0', borderRadius: 1 }} />
                              <Map size={15} color="#16a34a" />
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ marginBottom: 12 }}>
                                <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>Pickup</p>
                                <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: '2px 0 0' }}>{order.shopName}</p>
                              </div>
                              <div>
                                <p style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, margin: 0, textTransform: 'uppercase' }}>Deliver to</p>
                                <p style={{ fontSize: 13, fontWeight: 500, color: '#374151', margin: '2px 0 0', lineHeight: 1.4 }}>{order.deliveryAddress}</p>
                              </div>
                            </div>
                          </div>

                          {/* Items */}
                          <div style={{
                            background: '#f8fafc', borderRadius: 12, padding: '12px 14px', marginBottom: 16,
                            border: '1px solid #f1f5f9'
                          }}>
                            <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', margin: '0 0 8px', textTransform: 'uppercase' }}>Items</p>
                            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                              {order.items.map((item, i) => (
                                <li key={i} style={{ fontSize: 13, color: '#475569', fontWeight: 500, padding: '2px 0' }}>
                                  {item.quantity} &times; {item.name}
                                </li>
                              ))}
                            </ul>
                            {order.note && (
                              <div style={{
                                marginTop: 8, background: '#fff7ed', padding: '8px 10px', borderRadius: 8,
                                fontSize: 12, color: '#9a3412', border: '1px solid #fed7aa'
                              }}>
                                <strong>Note:</strong> {order.note}
                              </div>
                            )}
                          </div>

                          {/* Action */}
                          {!hasDeliveryBoy && (order.status === 'confirmed' || order.status === 'preparing') && (
                            <button onClick={() => handleUpdateStatus(order.id, 'picked_up')} style={{
                              width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                              boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                            }}>
                              <Truck size={16} /> Accept & Pick Up
                            </button>
                          )}
                          {isMine && order.status === 'picked_up' && (
                            <button onClick={() => handleUpdateStatus(order.id, 'delivered')} style={{
                              width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                              color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                              boxShadow: '0 4px 14px rgba(22,163,74,0.3)',
                            }}>
                              <CheckCircle2 size={16} /> Mark as Delivered
                            </button>
                          )}
                          {hasDeliveryBoy && !isMine && (
                            <div style={{
                              width: '100%', padding: '12px 0', borderRadius: 12, textAlign: 'center',
                              background: '#f3f4f6', color: '#9ca3af', fontSize: 13, fontWeight: 600
                            }}>
                              Assigned to another rider
                            </div>
                          )}
                          {order.status === 'pending' && (
                            <div style={{
                              width: '100%', padding: '12px 0', borderRadius: 12, textAlign: 'center',
                              background: '#fffbeb', color: '#b45309', fontSize: 13, fontWeight: 600,
                              border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                            }}>
                              <Clock size={15} /> Waiting for shop confirmation
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* HISTORY TAB */}
          {activeTab === "history" && (
            <>
              {historyOrders.length === 0 ? (
                <div style={{
                  background: '#fff', borderRadius: 20, padding: '60px 40px', textAlign: 'center',
                  border: '2px dashed #e5e7eb', maxWidth: 500, margin: '40px auto'
                }}>
                  <div style={{
                    width: 72, height: 72, background: '#f0fdf4', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
                  }}>
                    <History size={32} color="#86efac" />
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: 18, color: '#111827', margin: '0 0 8px' }}>No Deliveries Yet</h3>
                  <p style={{ color: '#6b7280', fontSize: 14 }}>Your completed deliveries will appear here.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 700 }}>
                  {historyOrders.map(order => (
                    <div key={order.id} style={{
                      background: '#fff', padding: '16px 20px', borderRadius: 14,
                      border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', transition: 'box-shadow 0.2s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{
                          width: 42, height: 42, borderRadius: 12,
                          background: order.status === 'delivered' ? '#f0fdf4' : '#fef2f2',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                          {order.status === 'delivered'
                            ? <CheckCircle2 size={20} color="#16a34a" />
                            : <Package size={20} color="#ef4444" />
                          }
                        </div>
                        <div>
                          <p style={{ fontWeight: 700, fontSize: 14, color: '#111827', margin: 0 }}>{order.shopName}</p>
                          <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>
                            {order.createdAt?.toDate?.().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) || "Recent"}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 16, fontWeight: 800, color: '#16a34a', margin: 0 }}>+ Rs. {order.deliveryFee}</p>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                          background: order.status === 'delivered' ? '#f0fdf4' : '#fef2f2',
                          color: order.status === 'delivered' ? '#16a34a' : '#ef4444',
                          textTransform: 'uppercase'
                        }}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div style={{ maxWidth: 600 }}>
              {/* Profile card */}
              <div style={{
                background: '#fff', borderRadius: 20, overflow: 'hidden',
                border: '1px solid #e5e7eb', marginBottom: 24
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #14532d 0%, #166534 100%)',
                  padding: '32px 28px', textAlign: 'center'
                }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: 20, background: 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 14px', border: '3px solid rgba(255,255,255,0.2)'
                  }}>
                    <User size={36} color="#86efac" />
                  </div>
                  <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0 }}>{profile?.name}</h3>
                  <p style={{ color: '#86efac', fontSize: 13, margin: '4px 0 0' }}>{profile?.email}</p>
                </div>

                <div style={{ padding: '20px 28px' }}>
                  {[
                    { icon: <MapPin size={16} color="#6b7280" />, label: 'City', value: profile?.city },
                    { icon: <Phone size={16} color="#6b7280" />, label: 'Phone', value: profile?.phone1 },
                    { icon: <CreditCard size={16} color="#6b7280" />, label: 'NIC', value: profile?.nic || 'Not provided' },
                    { icon: <Calendar size={16} color="#6b7280" />, label: 'Date of Birth', value: profile?.dob || 'Not provided' },
                    { icon: <Home size={16} color="#6b7280" />, label: 'Address', value: profile?.address },
                  ].map((item, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 0', borderBottom: i < 4 ? '1px solid #f3f4f6' : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {item.icon}
                        <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{item.label}</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Logout (mobile only - desktop has sidebar logout) */}
              <button onClick={handleLogout} className="rider-mobile-logout" style={{
                width: '100%', padding: '14px 0', borderRadius: 14, border: '2px solid #fecaca',
                background: '#fff', color: '#dc2626', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', display: 'none', alignItems: 'center', justifyContent: 'center', gap: 8
              }}>
                <LogOut size={18} /> Log Out
              </button>
            </div>
          )}

        </div>
      </main>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <nav className="rider-mobile-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff',
        borderTop: '1px solid #e5e7eb', display: 'none', zIndex: 50,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.06)', paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 0' }}>
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                background: 'none', border: 'none', cursor: 'pointer', padding: '6px 16px',
                color: isActive ? '#16a34a' : '#9ca3af', transition: 'color 0.2s', position: 'relative',
              }}>
                <div style={{ position: 'relative' }}>
                  {item.icon}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span style={{
                      position: 'absolute', top: -4, right: -8, background: '#ef4444', color: '#fff',
                      fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 10, minWidth: 14, textAlign: 'center'
                    }}>{item.badge}</span>
                  )}
                </div>
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
                {isActive && <div style={{ position: 'absolute', top: -1, width: 24, height: 3, background: '#16a34a', borderRadius: 2 }} />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ===== RESPONSIVE STYLES ===== */}
      <style>{`
        .rider-orders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 20px;
        }
        @media (max-width: 768px) {
          .rider-sidebar { display: none !important; }
          .rider-mobile-header { display: block !important; }
          .rider-mobile-nav { display: block !important; }
          .rider-mobile-logout { display: flex !important; }
          .rider-main {
            margin-left: 0 !important;
            padding-top: 80px;
          }
          .rider-main > div {
            padding: 16px 16px 90px !important;
          }
          .rider-orders-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .rider-sidebar { width: 220px !important; }
          .rider-main { margin-left: 220px !important; }
        }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
