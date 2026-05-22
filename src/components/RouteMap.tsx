"use client";

import { useEffect, useRef } from "react";

interface RouteMapProps {
  shopLat: number;
  shopLng: number;
  customerLat: number;
  customerLng: number;
  shopName?: string;
  onRouteCalculated?: (distanceKm: number) => void;
}

export default function RouteMap({ shopLat, shopLng, customerLat, customerLng, shopName, onRouteCalculated }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Load Leaflet CSS
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Load Leaflet JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      const L = (window as any).L;
      if (!mapRef.current) return;

      const centerLat = (shopLat + customerLat) / 2;
      const centerLng = (shopLng + customerLng) / 2;

      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false }).setView([centerLat, centerLng], 13);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

      // Shop marker (green) - Store icon
      const shopIcon = L.divIcon({
        className: "",
        html: `<div style="background:#2d6a2d;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">
                <div style="transform:rotate(45deg);width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></svg>
                </div></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      // Customer marker (blue) - MapPin icon
      const customerIcon = L.divIcon({
        className: "",
        html: `<div style="background:#1d4ed8;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">
                <div style="transform:rotate(45deg);width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="11" r="3"/><path d="M17.657 16.657 13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"/></svg>
                </div></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });

      L.marker([shopLat, shopLng], { icon: shopIcon }).addTo(map)
        .bindPopup(`<b>${shopName || "Shop"}</b><br>Pickup point`).openPopup();

      L.marker([customerLat, customerLng], { icon: customerIcon }).addTo(map)
        .bindPopup("<b>Your Location</b><br>Delivery here");

      // Fit both markers
      map.fitBounds([[shopLat, shopLng], [customerLat, customerLng]], { padding: [40, 40] });

      // Fetch route from OSRM (free, no key)
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${shopLng},${shopLat};${customerLng},${customerLat}?overview=full&geometries=geojson`;

      fetch(osrmUrl)
        .then(r => r.json())
        .then(data => {
          if (data.routes && data.routes[0]) {
            const routeCoords = data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng]);
            L.polyline(routeCoords, {
              color: "#2563eb",
              weight: 5,
              opacity: 0.85,
              dashArray: undefined,
              lineJoin: "round",
            }).addTo(map);
            map.fitBounds(routeCoords, { padding: [40, 40] });

            const distKm = data.routes[0].distance / 1000;
            const distKmDisplay = distKm.toFixed(1);

            // Pass distance to parent
            if (onRouteCalculated) onRouteCalculated(distKm);

            const info = document.getElementById("route-info");
            if (info) info.innerHTML = `
              <span style="display:inline-flex;align-items:center;gap:4px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>
                <b>${distKmDisplay} km</b>
              </span>`;

          }
        })
        .catch(() => {
          // Fallback straight line
          L.polyline([[shopLat, shopLng], [customerLat, customerLng]], {
            color: "#2563eb", weight: 4, opacity: 0.7, dashArray: "8,6"
          }).addTo(map);
        });
    };
    document.body.appendChild(script);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [shopLat, shopLng, customerLat, customerLng, shopName]);

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      <div id="route-info" className="text-xs text-gray-500 px-3 py-2 bg-blue-50 border-b border-blue-100 text-center font-medium">
        Calculating route...
      </div>
      <div ref={mapRef} style={{ height: 220, width: "100%" }} />
    </div>
  );
}
