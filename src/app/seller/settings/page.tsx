"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, MapPin, Navigation, CheckCircle2, Save, Store, Clock } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getShopByOwnerId, updateShop, Shop } from "@/lib/db";

const GREEN = "#2d6a2d";
const GREEN_LIGHT = "#348a34";

export default function SellerSettingsPage() {
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Location state
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationSaved, setLocationSaved] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/auth"); return; }
      const s = await getShopByOwnerId(user.uid);
      if (!s) { router.push("/seller"); return; }
      setShop(s);
      setDescription(s.description || "");
      if (s.lat && s.lng) { setLat(s.lat); setLng(s.lng); setLocationSaved(true); }
      setIsLoading(false);
    });
    return () => unsub();
  }, [router]);

  const handleMarkLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) { alert("Geolocation not supported."); setIsLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setLat(newLat);
        setLng(newLng);
        try {
          await updateShop(shop!.id, { lat: newLat, lng: newLng });
          setLocationSaved(true);
        } catch (e) { console.error(e); alert("Failed to save location."); }
        setIsLocating(false);
      },
      (err) => {
        console.error(err);
        alert("Location access denied. Please allow in browser settings.");
        setIsLocating(false);
      }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    setIsSaving(true);
    try {
      await updateShop(shop.id, {
        description,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) { alert(err.message || "Failed to save"); }
    finally { setIsSaving(false); }
  };

  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600 focus:bg-white transition-colors";

  if (isLoading) return (
    <div className="w-full max-w-md mx-auto min-h-dvh flex items-center justify-center bg-[#f5f6fa]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-700" />
    </div>
  );

  return (
    <div className="w-full min-h-dvh flex flex-col font-sans bg-[#f5f6fa] relative pb-10">

      {/* Header */}
      <div className="w-full sticky top-0 z-50 shadow-md" style={{ background: "linear-gradient(160deg, #1c3f1c 0%, #2d6a2d 100%)" }}>
        <div className="max-w-7xl mx-auto flex items-center px-4 sm:px-8 pt-10 sm:pt-6 pb-4">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white mr-3 hover:bg-white/30 transition-colors">
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 className="text-white text-lg sm:text-xl font-bold tracking-wide">Settings</h1>
            <p className="text-green-100 text-xs sm:text-sm">{shop?.name}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-8 pt-5 sm:pt-8 flex flex-col sm:grid sm:grid-cols-2 gap-5 sm:gap-8 sm:items-start">

        {/* ── Mark Shop Location ── */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <MapPin size={16} style={{ color: GREEN }} />
              Shop Location
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Customers will see this on your shop page</p>
          </div>

          {/* Map preview */}
          {lat && lng && (
            <div className="relative w-full overflow-hidden" style={{ height: 160 }}>
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.008}%2C${lat - 0.008}%2C${lng + 0.008}%2C${lat + 0.008}&layer=mapnik&marker=${lat}%2C${lng}`}
                style={{ filter: "saturate(0.9)" }}
              />
              {/* Hide OSM attribution */}
              <div className="absolute bottom-0 left-0 right-0 h-5 bg-white" />
            </div>
          )}

          <div className="p-4">
            {locationSaved && lat && lng && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-xl mb-3">
                <CheckCircle2 size={14} />
                <span>Location saved — Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}</span>
              </div>
            )}
            <button onClick={handleMarkLocation} disabled={isLocating}
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white disabled:opacity-60 transition-all active:scale-95"
              style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_LIGHT})` }}>
              {isLocating ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Locating...</>
              ) : locationSaved ? (
                <><Navigation size={16} /> Update Location</>
              ) : (
                <><Navigation size={16} /> Mark My Shop Location</>
              )}
            </button>
          </div>
        </div>

        {/* ── Shop Info Settings ── */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Store size={16} style={{ color: GREEN }} />
              Shop Info
            </h2>
          </div>
          <div className="p-4 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Shop Description</label>
              <textarea rows={3} placeholder="Tell customers about your shop..." className={`${inputCls} resize-none`}
                value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <button type="submit" disabled={isSaving}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all active:scale-95"
              style={{ background: `linear-gradient(135deg, ${GREEN}, ${GREEN_LIGHT})` }}>
              {isSaving ? "Saving..." : saved ? <><CheckCircle2 size={16} /> Saved!</> : <><Save size={16} /> Save Changes</>}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
