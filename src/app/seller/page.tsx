"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Plus, Package, X, Image as ImageIcon, Store, Menu, ClipboardList, Settings, User, ZoomIn, ZoomOut, RotateCw, Check, Edit2, Trash2, Sparkles, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getUserProfile, getShopByOwnerId, getProductsByShop, addProduct, updateProduct, deleteProduct, updateShop, getShopOrders, updateOrderStatus, updateOrderPreparation, getCategoryConfigs, Shop, Product, ProductVariation, Order, CategoryConfig } from "@/lib/db";

const IMGBB_API_KEY = "2b266bed1b2c4b092e370cabdda506d8";
const GEMINI_API_KEY = "AIzaSyA-j1hR-hUsOZkU4SM8lDOtkLFR1HQks1M";

/* ─── Square Image Cropper ─── */
function ImageCropper({ src, onCrop, onCancel }: { src: string; onCrop: (blob: Blob) => void; onCancel: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const activePointers = useRef<Map<number, { x: number, y: number }>>(new Map());
  const initialDistance = useRef<number | null>(null);
  const initialScale = useRef<number>(1);
  const SIZE = 300;

  const draw = useCallback((img: HTMLImageElement, s: number, r: number, off: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = SIZE;
    canvas.height = SIZE;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.save();
    ctx.translate(SIZE / 2 + off.x, SIZE / 2 + off.y);
    ctx.rotate((r * Math.PI) / 180);
    ctx.scale(s, s);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
    // Grid overlay
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 1;
    [SIZE / 3, (SIZE * 2) / 3].forEach(x => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, SIZE); ctx.stroke(); });
    [SIZE / 3, (SIZE * 2) / 3].forEach(y => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(SIZE, y); ctx.stroke(); });
    ctx.restore();
    // Border
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, SIZE - 2, SIZE - 2);
    ctx.restore();
  }, [SIZE]);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      const fit = Math.max(SIZE / img.width, SIZE / img.height);
      setScale(fit);
      setOffset({ x: 0, y: 0 });
      draw(img, fit, 0, { x: 0, y: 0 });
    };
    img.src = src;
  }, [src, draw]);

  useEffect(() => { if (imgRef.current) draw(imgRef.current, scale, rotation, offset); }, [scale, rotation, offset, draw]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1) {
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    } else if (activePointers.current.size === 2) {
      setDragging(false);
      const points = Array.from(activePointers.current.values());
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      initialDistance.current = dist;
      initialScale.current = scale;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1 && dragging) {
      setOffset({
        x: dragStart.current.ox + e.clientX - dragStart.current.x,
        y: dragStart.current.oy + e.clientY - dragStart.current.y
      });
    } else if (activePointers.current.size === 2 && initialDistance.current !== null) {
      const points = Array.from(activePointers.current.values());
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const newScale = initialScale.current * (dist / initialDistance.current);
      setScale(Math.max(0.3, Math.min(4, newScale)));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) {}
    activePointers.current.delete(e.pointerId);
    
    if (activePointers.current.size === 0) {
      setDragging(false);
    } else if (activePointers.current.size === 1) {
      const remainingPoint = Array.from(activePointers.current.values())[0];
      setDragging(true);
      dragStart.current = { x: remainingPoint.x, y: remainingPoint.y, ox: offset.x, oy: offset.y };
      initialDistance.current = null;
    }
  };

  const handleCrop = () => {
    // Calculate the exact pixel dimension of the crop based on original image resolution
    const originalCropSize = Math.round(SIZE / scale);
    // Use the original resolution (minimum 1000px to prevent tiny outputs if zoomed heavily)
    const EXPORT_SIZE = Math.max(1000, originalCropSize);
    
    const ratio = EXPORT_SIZE / SIZE;
    const canvas = document.createElement("canvas");
    canvas.width = EXPORT_SIZE; canvas.height = EXPORT_SIZE;
    const ctx = canvas.getContext("2d")!;
    const img = imgRef.current!;
    
    // Use highest quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    
    ctx.save();
    ctx.translate(EXPORT_SIZE / 2 + offset.x * ratio, EXPORT_SIZE / 2 + offset.y * ratio);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale * ratio, scale * ratio);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
    
    // Export with 1.0 (100% maximum original quality)
    canvas.toBlob(blob => blob && onCrop(blob), "image/jpeg", 1.0);
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/90">
      <div className="w-full max-w-sm mx-auto flex flex-col items-center gap-5 px-4">
        <div className="flex items-center justify-between w-full">
          <button onClick={onCancel} className="text-white/70 hover:text-white p-2"><X size={22} /></button>
          <div className="text-center">
            <h3 className="text-white font-bold text-base">Crop Photo</h3>
            <p className="text-white/40 text-xs">Drag to reposition</p>
          </div>
          <button onClick={handleCrop} className="bg-green-600 text-white px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-1">
            <Check size={16} /> Done
          </button>
        </div>

        {/* Square canvas */}
        <div style={{ width: SIZE, height: SIZE, borderRadius: 12, overflow: "hidden", cursor: dragging ? "grabbing" : "grab", touchAction: "none", border: "2px solid rgba(255,255,255,0.2)" }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <canvas ref={canvasRef} width={SIZE} height={SIZE} style={{ display: "block" }} />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 w-full justify-center">
          <button className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white" onClick={() => setScale(s => Math.max(0.3, s - 0.1))}><ZoomOut size={18} /></button>
          <input type="range" min={0.3} max={4} step={0.05} value={scale} onChange={e => setScale(Number(e.target.value))} className="flex-1 accent-green-500" />
          <button className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white" onClick={() => setScale(s => Math.min(4, s + 0.1))}><ZoomIn size={18} /></button>
          <button className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white" onClick={() => setRotation(r => r + 90)}><RotateCw size={18} /></button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Seller Dashboard ─── */
export default function SellerDashboard() {
  const router = useRouter();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [sellerName, setSellerName] = useState("");
  const [shopError, setShopError] = useState("");
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "orders">("products");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [isUpdatingShop, setIsUpdatingShop] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryConfig[]>([]);

  // Order Confirm Modal State
  const [confirmModalOrder, setConfirmModalOrder] = useState<Order | null>(null);
  const [selectedStep, setSelectedStep] = useState("");
  const [estimatedTime, setEstimatedTime] = useState("");

  // Add/Edit Product State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", description: "", category: "", unit: "none", amount: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'main' | string>('main');
  const fileInputRef = useRef<HTMLInputElement>(null);
  type VarItem = { id: string; name: string; price: string; imageUrl: string; imageFile: File | null; imagePreview: string | null };
  const [variations, setVariations] = useState<VarItem[]>([]);
  const [isAutoGen, setIsAutoGen] = useState(false);
  const [removingBgId, setRemovingBgId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.push("/auth"); return; }
      try {
        const profile = await getUserProfile(user.uid);
        if (!profile || profile.role !== "seller") { router.push("/auth"); return; }
        setSellerName(profile.name);
        const sellerShop = await getShopByOwnerId(user.uid);
        if (sellerShop) {
          setShop(sellerShop);
          // Load products, orders, and categories in parallel
          const [shopProducts, shopOrders, allCategories] = await Promise.all([
            getProductsByShop(sellerShop.id),
            getShopOrders(sellerShop.id),
            getCategoryConfigs()
          ]);
          setProducts(shopProducts);
          setOrders(shopOrders);
          setCategories(allCategories);
        }
      } catch (err: any) {
        setShopError(err.message || "Failed to fetch shop.");
      } finally { setIsLoading(false); setIsAuthLoading(false); }
    });
    return () => unsubscribe();
  }, [router]);

  const refreshOrders = async () => {
    if (!shop) return;
    setOrdersLoading(true);
    try {
      setOrders(await getShopOrders(shop.id));
    } finally { setOrdersLoading(false); }
  };

  const handleOrderAction = async (order: Order, action: "confirmed" | "cancelled") => {
    if (action === "confirmed" && shop) {
      const shopCategory = categories.find(c => c.id === shop.category);
      if (shopCategory?.statusSteps && shopCategory.statusSteps.length > 0) {
        // Open modal instead of confirming directly
        setConfirmModalOrder(order);
        setSelectedStep(shopCategory.statusSteps[0]);
        setEstimatedTime("");
        return;
      }
    }

    setUpdatingOrderId(order.id);
    try {
      await updateOrderStatus(order.id, action);
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: action } : o));
    } catch (err: any) { alert(err.message || "Failed"); }
    finally { setUpdatingOrderId(null); }
  };

  const submitOrderConfirmation = async () => {
    if (!confirmModalOrder) return;
    setUpdatingOrderId(confirmModalOrder.id);
    try {
      await updateOrderPreparation(confirmModalOrder.id, {
        status: "confirmed",
        preparationStatus: selectedStep || undefined,
        estimatedTime: estimatedTime || undefined,
      });
      setOrders(prev => prev.map(o => o.id === confirmModalOrder.id ? {
        ...o,
        status: "confirmed",
        preparationStatus: selectedStep || undefined,
        estimatedTime: estimatedTime || undefined
      } : o));
      setConfirmModalOrder(null);
    } catch (err: any) { alert(err.message || "Failed"); }
    finally { setUpdatingOrderId(null); }
  };

  const handleLogout = async () => { await signOut(auth); router.push("/auth"); };

  const openAddModal = () => {
    setEditingProduct(null);
    setNewProduct({ name: "", price: "", description: "", category: shop?.category || "", unit: "none", amount: "" });
    setImageFile(null); setImagePreview(null);
    setVariations([]);
    setCropTarget('main');
    setShowAddModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({ name: product.name, price: String(product.price), description: product.description || "", category: product.category || shop?.category || "", unit: product.unit || "none", amount: product.amount || "" });
    setImageFile(null);
    setImagePreview(product.imageUrl || null);
    setVariations((product.variations || []).map((v, i) => ({
      id: `v${i}_${Date.now()}`, name: v.name, price: String(v.price),
      imageUrl: v.imageUrl || "", imageFile: null, imagePreview: v.imageUrl || null,
    })));
    setCropTarget('main');
    setShowAddModal(true);
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`"${product.name}" delete karannada?`)) return;
    try {
      await deleteProduct(product.id);
      setProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (err: any) { alert(err.message || "Delete failed"); }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCropSrc(URL.createObjectURL(e.target.files[0]));
    }
    e.target.value = "";
  };

  const handleCropDone = (blob: Blob) => {
    const file = new File([blob], "image.jpg", { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    if (cropTarget === 'main') {
      setImageFile(file); setImagePreview(url);
    } else {
      setVariations(prev => prev.map(v => v.id === cropTarget ? { ...v, imageFile: file, imagePreview: url } : v));
    }
    setCropSrc(null);
  };

  const addVariation = () => setVariations(prev => [...prev, { id: `v${Date.now()}`, name: "", price: "", imageUrl: "", imageFile: null, imagePreview: null }]);
  const removeVariation = (id: string) => setVariations(prev => prev.filter(v => v.id !== id));
  const updateVariation = (id: string, field: string, value: string) => setVariations(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  const triggerImageUpload = (target: 'main' | string) => { setCropTarget(target); fileInputRef.current?.click(); };

  const handleAutoGen = async () => {
    if (!imagePreview) { alert("Please upload a product image first."); return; }
    setIsAutoGen(true);
    try {
      // Convert image preview URL to base64
      const imgRes = await fetch(imagePreview);
      const blob = await imgRes.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const mimeType = blob.type || 'image/jpeg';

      // Fetch available models from Gemini API
      let modelsToTry = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro-vision'];
      try {
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          const fetched = (modelsData.models || [])
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => m.name.replace('models/', ''))
            .filter((n: string) => n.includes('flash') || n.includes('pro'));
          if (fetched.length > 0) modelsToTry = fetched;
        }
      } catch { /* use defaults */ }

      let prompt = `Analyze this product image for an online shop listing. Generate a short product name (max 5 words) and a brief description (max 25 words). Return ONLY valid JSON with no markdown formatting: {"name": "...", "description": "..."}\nBe specific about what the product actually is.`;
      if (newProduct.unit !== "none" && newProduct.amount) {
        prompt += `\nImportant: The product size/weight is ${newProduct.amount} ${newProduct.unit}. Please mention this naturally in the description.`;
      }

      let generated: { name: string; description: string } | null = null;
      for (const model of modelsToTry) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [
                    { inline_data: { mime_type: mimeType, data: base64 } },
                    { text: prompt }
                  ]
                }]
              })
            }
          );
          if (!res.ok) continue;
          const data = await res.json();
          const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const clean = text.replace(/```json|```/g, '').trim();
          const parsed = JSON.parse(clean);
          if (parsed?.name) { generated = parsed; break; }
        } catch { continue; }
      }

      if (generated) {
        setNewProduct(prev => ({ ...prev, name: generated!.name || prev.name, description: generated!.description || prev.description }));
      } else {
        alert('Could not generate product info. Try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Auto-gen failed. Please check your image and try again.');
    } finally {
      setIsAutoGen(false);
    }
  };

  const handleRemoveBg = async (targetId: 'main' | string, addWhiteBg: boolean = false) => {
    let fileToProcess: File | null = null;
    let currentPreviewUrl: string | null = null;

    if (targetId === 'main') {
      fileToProcess = imageFile;
      currentPreviewUrl = imagePreview;
    } else {
      const v = variations.find(v => v.id === targetId);
      if (v) {
        fileToProcess = v.imageFile;
        currentPreviewUrl = v.imagePreview;
      }
    }

    if (!fileToProcess && currentPreviewUrl) {
      try {
        const res = await fetch(currentPreviewUrl);
        const blob = await res.blob();
        fileToProcess = new File([blob], "image.jpg", { type: blob.type });
      } catch (e) {
        alert("Could not load existing image for background removal.");
        return;
      }
    }

    if (!fileToProcess) return;

    setRemovingBgId(targetId);
    try {
      const formData = new FormData();
      formData.append('image_file', fileToProcess);
      formData.append('size', 'auto');
      if (addWhiteBg) {
        formData.append('bg_color', 'white');
      }

      const res = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: { 'X-Api-Key': 'qgCuSNaXQFMCXTnz9tnfLPdH' },
        body: formData
      });

      if (!res.ok) throw new Error("Background removal failed");

      const blob = await res.blob();
      const newFile = new File([blob], addWhiteBg ? "white-bg.png" : "no-bg.png", { type: "image/png" });
      const newUrl = URL.createObjectURL(blob);

      if (targetId === 'main') {
        setImageFile(newFile);
        setImagePreview(newUrl);
      } else {
        setVariations(prev => prev.map(v => v.id === targetId ? { ...v, imageFile: newFile, imagePreview: newUrl } : v));
      }
    } catch (err: any) {
      alert("Failed to remove background.");
      console.error(err);
    } finally {
      setRemovingBgId(null);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
    const data = await res.json();
    if (data.success) return data.data.url;
    throw new Error("Image upload failed");
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    if (!newProduct.name || !newProduct.price) { alert("Name and Price required."); return; }
    setIsAdding(true);
    try {
      let imageUrl = editingProduct?.imageUrl || "";
      if (imageFile) imageUrl = await uploadImage(imageFile);
      // Upload variation images
      const savedVariations: ProductVariation[] = await Promise.all(
        variations.filter(v => v.name).map(async (v) => {
          let vImg = v.imageUrl;
          if (v.imageFile) vImg = await uploadImage(v.imageFile);
          const variationObj: any = { name: v.name, price: Number(v.price) || 0 };
          if (vImg) variationObj.imageUrl = vImg;
          return variationObj as ProductVariation;
        })
      );

      const payload: any = {
        name: newProduct.name,
        price: Number(newProduct.price),
        category: newProduct.category || shop.category,
        description: newProduct.description || "",
        imageUrl: imageUrl || "",
      };

      if (newProduct.unit && newProduct.unit !== "none" && newProduct.amount) {
        payload.unit = newProduct.unit;
        payload.amount = newProduct.amount;
      } else {
        payload.unit = "none";
        payload.amount = "";
      }

      if (savedVariations.length > 0) {
        payload.variations = savedVariations;
      } else if (editingProduct && editingProduct.variations && editingProduct.variations.length > 0) {
        payload.variations = [];
      }

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
      } else {
        await addProduct({ shopId: shop.id, isAvailable: true, ...payload });
      }
      setProducts(await getProductsByShop(shop.id));
      setShowAddModal(false);
      setNewProduct({ name: "", price: "", description: "", category: shop.category || "", unit: "none", amount: "" });
      setImageFile(null); setImagePreview(null); setVariations([]);
    } catch (err: any) {
      alert(err.message || "Failed to save product");
    } finally { setIsAdding(false); }
  };

  const handleUpdateShopSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    setIsUpdatingShop(true);
    try {
      await updateShop(shop.id, { description: editDescription });
      setShop({ ...shop, description: editDescription });
      setShowSettingsModal(false);
    } catch (err: any) { alert(err.message || "Failed"); }
    finally { setIsUpdatingShop(false); }
  };

  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-600 focus:bg-white";

  if (isAuthLoading || isLoading) return (
    <div className="w-full min-h-dvh flex flex-col font-sans bg-[#f5f6fa] relative pb-24 sm:pb-0">
      {/* Skeleton Header */}
      <div className="w-full sticky top-0 z-50 shadow-md" style={{ background: "linear-gradient(160deg, #1c3f1c 0%, #2d6a2d 100%)" }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-8 pt-10 sm:pt-4 pb-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl hidden sm:block"></div>
            <div className="flex flex-col gap-2">
              <div className="h-5 w-32 bg-white/20 rounded-md"></div>
              <div className="h-3 w-24 bg-white/10 rounded-md"></div>
            </div>
          </div>
          <div className="flex gap-3">
             <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 hidden sm:block"></div>
             <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20"></div>
          </div>
        </div>
      </div>

      {/* Skeleton Body */}
      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col relative sm:px-4 sm:mt-6 animate-pulse">
        {/* Skeleton Tabs */}
        <div className="flex mx-4 sm:mx-auto sm:w-[500px] mt-4 sm:mt-8 mb-1 bg-gray-200 rounded-xl p-1 gap-1 h-10">
           <div className="flex-1 bg-white/60 rounded-lg"></div>
           <div className="flex-1"></div>
        </div>

        {/* Skeleton Content */}
        <div className="flex-1 px-4 sm:px-8 pt-5 sm:pt-8 pb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="h-6 w-32 bg-gray-200 rounded-md"></div>
            <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
          </div>
          <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl p-3 flex gap-3 shadow-sm border border-gray-50">
                <div className="w-20 h-20 bg-gray-100 rounded-xl flex-shrink-0"></div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="h-4 w-3/4 bg-gray-200 rounded-md mb-2"></div>
                    <div className="h-3 w-full bg-gray-100 rounded-md"></div>
                  </div>
                  <div className="h-4 w-1/3 bg-gray-200 rounded-md mt-2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (!shop) return (
    <div className="w-full max-w-md mx-auto min-h-dvh flex flex-col items-center justify-center bg-[#f5f6fa] font-sans px-6 text-center">
      <Store size={64} className="text-gray-300 mb-4" />
      <h2 className="text-xl font-bold text-gray-800 mb-2">No Shop Found</h2>
      {shopError && <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100 mb-6 w-full text-left font-mono">{shopError}</div>}
      <button onClick={handleLogout} className="px-6 py-2 bg-white text-red-600 font-bold rounded-xl shadow-sm">Sign Out</button>
    </div>
  );

  return (
    <div className="w-full min-h-dvh flex flex-col font-sans bg-[#f5f6fa] relative pb-24 sm:pb-0">

      {/* Header */}
      <div className="w-full sticky top-0 z-50 shadow-md" style={{ background: "linear-gradient(160deg, #1c3f1c 0%, #2d6a2d 100%)" }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-8 pt-10 sm:pt-4 pb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowDrawer(true)} className="text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors sm:hidden"><Menu size={24} /></button>
            <div className="hidden sm:flex items-center justify-center bg-white/10 w-10 h-10 rounded-xl mr-2">
              <Store size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-white text-lg sm:text-xl font-bold tracking-wide truncate">{shop.name}</h1>
              <p className="text-green-100 text-xs sm:text-sm">Seller Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/seller/settings")} title="Shop Settings" className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 items-center justify-center text-white hover:bg-white/20 transition-colors">
              <Settings size={18} />
            </button>
            <button onClick={handleLogout} title="Sign Out" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Wrapper */}
      <div className="flex-1 w-full max-w-7xl mx-auto flex flex-col relative sm:px-4 sm:mt-6">

        {/* Tab Switcher */}
        <div className="flex mx-4 sm:mx-auto sm:w-[500px] mt-4 sm:mt-8 mb-1 bg-gray-100 rounded-xl p-1 gap-1">
          <button onClick={() => setActiveTab("products")}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === "products" ? "bg-white shadow-sm text-gray-900" : "text-gray-400"
              }`}>
            <Package size={16} /> Products
          </button>
          <button onClick={() => { setActiveTab("orders"); refreshOrders(); }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === "orders" ? "bg-white shadow-sm text-gray-900" : "text-gray-400"
              }`}>
            <ClipboardList size={16} /> Orders
            {orders.filter(o => o.status === "pending").length > 0 && (
              <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {orders.filter(o => o.status === "pending").length}
              </span>
            )}
          </button>
        </div>

        {/* Products Tab */}
        {activeTab === "products" && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-5 sm:pt-8 pb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-lg">Your Products</h2>
              <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-full">{products.length} Items</span>
            </div>

            {products.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center shadow-sm text-center">
                <Package size={48} className="text-gray-200 mb-3" />
                <h3 className="text-gray-900 font-bold mb-1">No products yet</h3>
                <p className="text-sm text-gray-400 mb-4">Start by adding your first product.</p>
                <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 bg-green-700 text-white rounded-xl font-bold shadow-sm">
                  <Plus size={18} /> Add Product
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {products.map(product => (
                  <div key={product.id} className="bg-white rounded-2xl p-3 flex gap-3 shadow-sm border border-gray-100">
                    {/* Square Image */}
                    <div className="w-20 h-20 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                      {product.imageUrl
                        ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        : <Package size={24} className="text-gray-300" />}
                    </div>
                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 leading-tight truncate">{product.name}</h3>
                        {product.amount && product.unit && product.unit !== "none" && (
                          <span className="text-[10px] font-semibold text-gray-500 block">{product.amount}{product.unit === "kg" || product.unit === "g" || product.unit === "ml" || product.unit === "L" ? product.unit : ` ${product.unit}`}</span>
                        )}
                        {product.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{product.description}</p>}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-bold text-green-700 text-sm">Rs. {product.price}</span>
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                          {product.isAvailable ? "Available" : "Hidden"}
                        </span>
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-1.5 justify-center flex-shrink-0">
                      <button onClick={() => openEditModal(product)}
                        className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDeleteProduct(product)}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-4 sm:pt-8 pb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 text-lg">Incoming Orders</h2>
              <button onClick={refreshOrders} className="text-xs text-green-700 font-bold bg-green-50 px-3 py-1.5 rounded-full">
                {ordersLoading ? "Loading..." : "Refresh"}
              </button>
            </div>

            {ordersLoading && orders.length === 0 ? (
              <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-2xl p-4 animate-pulse shadow-sm">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center shadow-sm text-center">
                <ClipboardList size={40} className="text-gray-200 mb-3" />
                <h3 className="text-gray-700 font-bold mb-1">No orders yet</h3>
                <p className="text-xs text-gray-400">New orders will appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {orders.map(order => {
                  const isPending = order.status === "pending";
                  const isConfirmed = order.status === "confirmed";
                  const isCancelled = order.status === "cancelled";
                  const isDelivered = order.status === "delivered";
                  const isUpdating = updatingOrderId === order.id;
                  return (
                    <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden">
                      {/* Status Strip */}
                      <div className={`px-4 py-2 flex items-center justify-between ${isPending ? "bg-amber-50" :
                          isConfirmed ? "bg-blue-50" :
                            isCancelled ? "bg-red-50" :
                              isDelivered ? "bg-green-50" : "bg-gray-50"
                        }`}>
                        <span className={`text-xs font-bold uppercase tracking-wide ${isPending ? "text-amber-700" :
                            isConfirmed ? "text-blue-700" :
                              isCancelled ? "text-red-600" :
                                isDelivered ? "text-green-700" : "text-gray-500"
                          }`}>
                          {isPending ? "🔔 New Order" : isConfirmed ? "✅ Confirmed" : isCancelled ? "❌ Cancelled" : isDelivered ? "🎉 Delivered" : order.status}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {order.createdAt?.toDate?.().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) || ""}
                        </span>
                      </div>

                      <div className="p-4">
                        {/* Customer note / address */}
                        <p className="text-[11px] text-gray-400 mb-2 line-clamp-1">📍 {order.deliveryAddress}</p>

                        {/* Items */}
                        <div className="flex flex-col gap-0.5 mb-3">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-gray-700 font-medium">{item.quantity}× {item.name}</span>
                              <span className="text-gray-500">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>

                        {/* Shop Subtotal */}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-50 mb-3">
                          <span className="text-xs text-gray-400 uppercase tracking-wide font-bold">Shop Total</span>
                          <span className="font-black text-[#2d6a2d] text-sm">Rs. {(order.totalAmount - order.deliveryFee).toLocaleString()}</span>
                        </div>

                        {/* Confirm / Reject buttons */}
                        {isPending && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOrderAction(order, "cancelled")}
                              disabled={isUpdating}
                              className="flex-1 py-2.5 rounded-xl text-red-600 bg-red-50 font-bold text-sm border border-red-100 disabled:opacity-50">
                              {isUpdating ? "..." : "Reject"}
                            </button>
                            <button
                              onClick={() => handleOrderAction(order, "confirmed")}
                              disabled={isUpdating}
                              className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm shadow-md disabled:opacity-50"
                              style={{ background: "linear-gradient(135deg, #2d6a2d, #348a34)" }}>
                              {isUpdating ? "..." : "✓ Confirm"}
                            </button>
                          </div>
                        )}
                        {isConfirmed && (
                          <button
                            onClick={() => handleOrderAction(order, "cancelled")}
                            disabled={isUpdating}
                            className="w-full py-2 rounded-xl text-gray-500 bg-gray-50 font-medium text-xs border border-gray-100 disabled:opacity-50">
                            Cancel Order
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Add Button */}
      {products.length > 0 && (
        <button onClick={openAddModal}
          className="fixed bottom-8 right-4 w-14 h-14 text-white rounded-full flex items-center justify-center z-40 active:scale-95 transition-transform"
          style={{ background: "linear-gradient(135deg, #2d6a2d, #348a34)", boxShadow: "0 4px 16px rgba(45,106,45,0.4)" }}>
          <Plus size={28} />
        </button>
      )}

      {/* Image Cropper */}
      {cropSrc && <ImageCropper src={cropSrc} onCrop={handleCropDone} onCancel={() => setCropSrc(null)} />}

      {/* Add / Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isAdding && setShowAddModal(false)} />
          <div className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl shadow-2xl max-h-[90dvh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-5 pt-5 pb-3 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">{editingProduct ? "Edit Product" : "Add New Product"}</h2>
              <button onClick={() => !isAdding && setShowAddModal(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600"><X size={18} /></button>
            </div>

            {/* Scrollable Form Body */}
            <div className="overflow-y-auto flex-1 px-5 pb-5">
              <form onSubmit={handleSaveProduct} className="flex flex-col gap-4">
                {/* Hidden file input - shared for main + variations */}
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="hidden" />

                {/* 1. CATEGORY - TOP */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Category</label>
                  <div className="relative">
                    <select className={`${inputCls} appearance-none pr-9`} value={newProduct.category}
                      onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.emoji ? `${cat.emoji} ` : ""}{cat.label}{cat.id === shop?.category ? " (Shop Default)" : ""}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                    </div>
                  </div>
                  {newProduct.category !== shop?.category && (
                    <button type="button" onClick={() => setNewProduct({ ...newProduct, category: shop?.category || "" })}
                      className="text-[11px] text-green-700 font-semibold mt-1 hover:underline">↺ Reset to shop default</button>
                  )}
                </div>

                {/* 2. Product Photo */}
                <div className="flex gap-3 items-start">
                  <div className="w-24 h-24 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex-shrink-0 overflow-hidden cursor-pointer hover:bg-gray-100 transition-colors relative flex items-center justify-center"
                    onClick={() => triggerImageUpload('main')}>
                    {imagePreview ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover bg-white" /> : <ImageIcon size={24} className="text-gray-400" />}
                    {imagePreview && <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"><span className="text-white text-[10px] font-bold">Change</span></div>}
                  </div>
                  <div className="flex-1 flex flex-col gap-1.5 justify-center pt-1">
                    <p className="text-xs font-bold text-gray-600">Product Photo</p>
                    <p className="text-[11px] text-gray-400">Tap the square to upload.<br />You can crop after selecting.</p>
                    {imagePreview && (
                      <div className="flex flex-col gap-1.5 mt-1">
                        <button type="button" onClick={() => handleRemoveBg('main')} disabled={removingBgId === 'main'} className="text-[11px] text-blue-600 font-semibold text-left flex items-center gap-1 disabled:opacity-50 hover:underline w-fit">
                          {removingBgId === 'main' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                          {removingBgId === 'main' ? "Removing BG..." : "Remove BG (Transparent)"}
                        </button>
                        <button type="button" onClick={() => handleRemoveBg('main', true)} disabled={removingBgId === 'main'} className="text-[11px] text-blue-600 font-semibold text-left flex items-center gap-1 disabled:opacity-50 hover:underline w-fit">
                          {removingBgId === 'main' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                          {removingBgId === 'main' ? "Removing BG..." : "Remove BG (White)"}
                        </button>
                        <button type="button" onClick={() => { setImageFile(null); setImagePreview(editingProduct?.imageUrl || null); }} className="text-[11px] text-red-500 font-semibold text-left hover:underline w-fit">Remove photo</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Product Name */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-700">Product Name</label>
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={handleAutoGen}
                        disabled={isAutoGen}
                        className="flex items-center gap-1 text-[11px] font-bold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-lg hover:bg-violet-100 transition-colors disabled:opacity-60"
                      >
                        {isAutoGen
                          ? <><Loader2 size={11} className="animate-spin" /> Generating...</>
                          : <><Sparkles size={11} /> Auto Gen</>}
                      </button>
                    )}
                  </div>
                  <input type="text" required placeholder="e.g. Chicken Fried Rice" className={inputCls}
                    value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} />
                </div>

                {/* 4. Base Price */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Base Price (Rs.)</label>
                  <input type="number" required min="0" placeholder="e.g. 1200" className={inputCls}
                    value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })} />
                </div>

                {/* 4.5. Weight/Volume */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Amount (Optional)</label>
                    <input type="number" min="0" step="any" placeholder="e.g. 500" className={inputCls}
                      value={newProduct.amount} onChange={e => setNewProduct({ ...newProduct, amount: e.target.value })}
                      disabled={newProduct.unit === "none"} />
                  </div>
                  <div className="flex-[0.7]">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Unit</label>
                    <div className="relative">
                      <select className={`${inputCls} appearance-none pr-8`} value={newProduct.unit}
                        onChange={e => setNewProduct({ ...newProduct, unit: e.target.value, amount: e.target.value === "none" ? "" : newProduct.amount })}>
                        <option value="none">None</option>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="L">L</option>
                        <option value="ml">ml</option>
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">Description (Optional)</label>
                  <textarea rows={2} placeholder="e.g. Delicious spicy fried rice..." className={`${inputCls} resize-none`}
                    value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })} />
                </div>

                {/* 6. VARIATIONS */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700">Variations <span className="text-gray-400 font-normal">(Optional)</span></label>
                      <p className="text-[10px] text-gray-400 mt-0.5">Add sizes, colors, flavors etc.</p>
                    </div>
                    <button type="button" onClick={addVariation}
                      className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors">
                      <Plus size={13} /> Add
                    </button>
                  </div>

                  {variations.length === 0 ? (
                    <div className="text-[11px] text-gray-400 text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      No variations. Click &quot;Add&quot; to create one.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {variations.map((v) => (
                        <div key={v.id} className="flex gap-2 items-center bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                          {/* Variation Image */}
                          <div className="flex flex-col gap-1 items-center justify-center">
                            <div
                              className="w-14 h-14 rounded-lg bg-white border-2 border-dashed border-gray-200 flex-shrink-0 overflow-hidden cursor-pointer flex items-center justify-center hover:bg-gray-50 transition-colors"
                              onClick={() => triggerImageUpload(v.id)}
                            >
                              {v.imagePreview
                                ? <img src={v.imagePreview} alt="" className="w-full h-full object-cover bg-white" />
                                : <ImageIcon size={16} className="text-gray-300" />}
                            </div>
                            {v.imagePreview && (
                              <div className="flex gap-2 w-full mt-1">
                                <button type="button" onClick={() => handleRemoveBg(v.id)} disabled={removingBgId === v.id} title="Remove Background (Transparent)" className="flex-1 justify-center text-[10px] text-blue-600 font-bold flex items-center gap-0.5 disabled:opacity-50 hover:underline">
                                  {removingBgId === v.id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} Clear BG
                                </button>
                                <button type="button" onClick={() => handleRemoveBg(v.id, true)} disabled={removingBgId === v.id} title="Remove Background (White)" className="flex-1 justify-center text-[10px] text-blue-600 font-bold flex items-center gap-0.5 disabled:opacity-50 hover:underline">
                                  {removingBgId === v.id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} White BG
                                </button>
                              </div>
                            )}
                          </div>
                          {/* Name + Price */}
                          <div className="flex-1 flex flex-col gap-1.5">
                            <input type="text" placeholder="Name (e.g. Small, Red...)"
                              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-green-500"
                              value={v.name} onChange={e => updateVariation(v.id, 'name', e.target.value)} />
                            <input type="number" placeholder="Price (Rs.)" min="0"
                              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-green-500"
                              value={v.price} onChange={e => updateVariation(v.id, 'price', e.target.value)} />
                          </div>
                          {/* Delete */}
                          <button type="button" onClick={() => removeVariation(v.id)}
                            className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center flex-shrink-0 hover:bg-red-100 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button type="submit" disabled={isAdding}
                  className="w-full mt-1 py-3.5 rounded-xl font-bold text-white shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #2d6a2d, #348a34)" }}>
                  {isAdding ? (editingProduct ? "Saving..." : "Adding...") : (editingProduct ? "Save Changes" : "Add Product")}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Side Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-[110] flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDrawer(false)} />
          <div className="relative w-72 bg-white h-full shadow-2xl flex flex-col">
            <div className="pt-12 pb-6 px-6 relative" style={{ background: "linear-gradient(135deg, #2d6a2d, #348a34)" }}>
              <button onClick={() => setShowDrawer(false)} className="absolute top-10 right-4 w-8 h-8 flex items-center justify-center bg-black/10 rounded-full text-white"><X size={18} /></button>
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md mb-4 text-green-700"><User size={32} /></div>
              <h2 className="text-white font-bold text-xl">{sellerName}</h2>
              <p className="text-green-100 text-sm">{shop.name}</p>
            </div>
            <div className="flex-1 py-4 flex flex-col gap-1 px-3">
              <button className="flex items-center gap-4 px-4 py-3.5 bg-green-50 text-green-800 rounded-xl font-bold"><Package size={20} /> Products</button>
              <button className="flex items-center gap-4 px-4 py-3.5 text-gray-600 hover:bg-gray-50 rounded-xl font-medium" onClick={() => alert("Coming soon!")}><ClipboardList size={20} /> Orders</button>
              <button className="flex items-center gap-4 px-4 py-3.5 text-gray-600 hover:bg-gray-50 rounded-xl font-medium" onClick={() => { setShowDrawer(false); router.push("/seller/settings"); }}><Settings size={20} /> Settings</button>
            </div>
            <div className="p-5 border-t border-gray-100">
              <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-50 text-red-600 font-bold"><LogOut size={18} /> Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isUpdatingShop && setShowSettingsModal(false)} />
          <div className="relative w-full max-w-md mx-auto bg-white rounded-t-3xl p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-gray-900">Shop Settings</h2>
              <button onClick={() => !isUpdatingShop && setShowSettingsModal(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateShopSettings} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Shop Description</label>
                <textarea rows={4} placeholder="Tell customers about your shop..." className={`${inputCls} resize-none`}
                  value={editDescription} onChange={e => setEditDescription(e.target.value)} />
              </div>
              <button type="submit" disabled={isUpdatingShop}
                className="w-full mt-1 py-3.5 rounded-xl font-bold text-white shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #2d6a2d, #348a34)" }}>
                {isUpdatingShop ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Order Confirm Modal */}
      {confirmModalOrder && shop && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !updatingOrderId && setConfirmModalOrder(null)} />
          <div className="relative w-full max-w-sm mx-auto bg-white rounded-3xl p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Confirm Order</h2>
              <button onClick={() => !updatingOrderId && setConfirmModalOrder(null)} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-600"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">Select the current preparation status and estimated time for this order.</p>

            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Preparation Status</label>
                <div className="flex flex-wrap gap-2">
                  {categories.find(c => c.id === shop.category)?.statusSteps?.map(step => (
                    <button
                      key={step}
                      onClick={() => setSelectedStep(step)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${selectedStep === step
                          ? "bg-green-50 border-green-500 text-green-700"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                    >
                      {step}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Estimated Time</label>
                <div className="flex flex-wrap gap-2">
                  {["10 min", "15 min", "20 min", "30 min"].map(time => (
                    <button
                      key={time}
                      onClick={() => setEstimatedTime(time)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${estimatedTime === time
                          ? "bg-green-50 border-green-500 text-green-700"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={submitOrderConfirmation}
              disabled={updatingOrderId === confirmModalOrder.id || !selectedStep}
              className="w-full py-3.5 rounded-xl font-bold text-white shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #2d6a2d, #348a34)" }}>
              {updatingOrderId === confirmModalOrder.id ? "Confirming..." : "Confirm & Send to Customer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
