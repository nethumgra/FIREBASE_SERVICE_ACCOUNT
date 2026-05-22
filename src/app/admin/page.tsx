"use client";

import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Image as ImageIcon,
  Store,
  Users,
  Settings,
  Upload,
  Trash2,
  Power,
  Plus,
  Edit2,
  Save,
  X,
  Box,
  MapPin,
  Package,
  Bike
} from "lucide-react";
import { getBanners, addBanner, toggleBannerStatus, deleteBanner, Banner, getAllShops, Shop, updateShop, deleteShop, getCategoryConfigs, updateCategoryConfig, addCategoryConfig, deleteCategoryConfig, CategoryConfig, Location, getLocations, addLocation, deleteLocation, getAllProducts, Product, updateProduct, getUsersByRole, VitoUser, getAppUpdateConfig, setAppUpdateConfig } from "@/lib/db";
import { createSellerAccountAndShop } from "@/lib/auth";
import { createDeliveryBoyAccount } from "@/lib/auth";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { SRI_LANKA_CITIES, SRI_LANKA_DISTRICTS } from "@/lib/config";
import "./admin.css";

const IMGBB_API_KEY = "217524a50a4562e887cc3bca17c1fd41"; // Updated with user provided key


export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("banners");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [deliveryBoys, setDeliveryBoys] = useState<VitoUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingShop, setIsCreatingShop] = useState(false);
  const [showAddShopForm, setShowAddShopForm] = useState(false);

  // New Delivery Boy Form
  const [showAddBoyForm, setShowAddBoyForm] = useState(false);
  const [isCreatingBoy, setIsCreatingBoy] = useState(false);
  const [newBoyDistrict, setNewBoyDistrict] = useState("");
  const [newBoyCities, setNewBoyCities] = useState<string[]>([]);
  const [newBoy, setNewBoy] = useState({
    name: "",
    email: "",
    password: "",
    phone1: "",
    address: "",
    city: "",
    nic: "",
    dob: ""
  });

  // New Shop Form State
  const [newShopDistrict, setNewShopDistrict] = useState("");
  const [newShopCities, setNewShopCities] = useState<string[]>([]);
  const [newShop, setNewShop] = useState({
    email: "",
    password: "",
    shopName: "",
    address: "",
    city: "",
    category: ""
  });

  // Edit Shop State
  const [editShopDistrict, setEditShopDistrict] = useState("");
  const [editShopCities, setEditShopCities] = useState<string[]>([]);
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [editShopForm, setEditShopForm] = useState<Partial<Shop>>({});
  const [isUpdatingShop, setIsUpdatingShop] = useState(false);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [placement, setPlacement] = useState<Banner["placement"]>("home_top");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shop Banner Modal State
  const [bannerModalShop, setBannerModalShop] = useState<Shop | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Shop Logo Modal State
  const [logoModalShop, setLogoModalShop] = useState<Shop | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [catUploadingId, setCatUploadingId] = useState<string | null>(null);
  const catInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // New Category Form State
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [newCategory, setNewCategory] = useState({ label: "", statusSteps: [] as string[] });
  const [newCategoryFile, setNewCategoryFile] = useState<File | null>(null);
  const [newCategoryPreview, setNewCategoryPreview] = useState<string | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const newCatInputRef = useRef<HTMLInputElement>(null);

  // Local previews for existing categories
  const [catPreviews, setCatPreviews] = useState<Record<string, string>>({});

  // Edit Category State
  const [editingCategory, setEditingCategory] = useState<CategoryConfig | null>(null);
  const [editCatLabel, setEditCatLabel] = useState("");
  const [editCatSteps, setEditCatSteps] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Locations State
  const [locations, setLocations] = useState<Location[]>([]);
  const [newLocDistrict, setNewLocDistrict] = useState("");
  const [newLocCity, setNewLocCity] = useState("");
  const [isAddingLocation, setIsAddingLocation] = useState(false);

  // App Update State
  const [appConfig, setAppConfig] = useState<{latestVersion: string, updateUrl: string} | null>(null);
  const [updateVersionInput, setUpdateVersionInput] = useState("");
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [isUploadingUpdate, setIsUploadingUpdate] = useState(false);

  useEffect(() => {
    if (activeTab === "banners") loadBanners();
    if (activeTab === "shops") { loadShops(); loadCategories(); loadLocations(); }
    if (activeTab === "categories") loadCategories();
    if (activeTab === "locations") loadLocations();
    if (activeTab === "items") loadProducts();
    if (activeTab === "delivery_boys") { loadDeliveryBoys(); loadLocations(); }
    if (activeTab === "settings") loadAppConfig();
  }, [activeTab]);

  const loadAppConfig = async () => {
    try {
      const conf = await getAppUpdateConfig();
      if (conf) {
        setAppConfig(conf);
        setUpdateVersionInput(conf.latestVersion);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUploadAppUpdate = async () => {
    if (!updateVersionInput.trim()) return alert("Enter a version number");
    if (!updateFile && !appConfig?.updateUrl) return alert("Please select a .zip file");
    
    setIsUploadingUpdate(true);
    try {
      let downloadUrl = appConfig?.updateUrl || "";
      if (updateFile) {
        const storageRef = ref(storage, `app_updates/vito_update_${Date.now()}.zip`);
        await uploadBytes(storageRef, updateFile);
        downloadUrl = await getDownloadURL(storageRef);
      }
      
      await setAppUpdateConfig(updateVersionInput.trim(), downloadUrl);
      alert("App update deployed successfully! Users will now receive the OTA update.");
      setUpdateFile(null);
      await loadAppConfig();
    } catch (err: any) {
      console.error(err);
      alert("Failed to deploy update: " + err.message);
    } finally {
      setIsUploadingUpdate(false);
    }
  };

  const loadDeliveryBoys = async () => {
    setIsLoading(true);
    try {
      const data = await getUsersByRole("delivery");
      setDeliveryBoys(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await getAllProducts();
      setProducts(data);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleProductStatus = async (productId: string, currentStatus: boolean) => {
    try {
      await updateProduct(productId, { isAvailable: !currentStatus });
      await loadProducts();
    } catch (err) {
      console.error("Toggle product error:", err);
    }
  };

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const data = await getCategoryConfigs();
      setCategories(data);
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLocations = async () => {
    setIsLoading(true);
    try {
      const data = await getLocations();
      setLocations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocDistrict || !newLocCity.trim()) return alert("Select a district and enter a city name");
    setIsAddingLocation(true);
    try {
      await addLocation(newLocDistrict, newLocCity.trim());
      setNewLocCity("");
      loadLocations();
    } catch (err) {
      console.error(err);
      alert("Failed to add location");
    } finally {
      setIsAddingLocation(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this city?")) return;
    try {
      await deleteLocation(id);
      loadLocations();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCategoryIconUpload = async (cat: CategoryConfig, file: File) => {
    setCatUploadingId(cat.id);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
      const data = await res.json();
      console.log("ImgBB Response:", data);
      if (data.success) {
        await updateCategoryConfig(cat.id, { imageUrl: data.data.url });
        await loadCategories();
        alert("Image saved successfully to database!");
      } else {
        console.error("ImgBB Error:", data.error);
        throw new Error(data.error?.message || "Upload failed");
      }
    } catch (err: any) {
      alert(err.message || "Upload failed");
      // Revert preview on failure
      setCatPreviews(prev => {
        const copy = { ...prev };
        delete copy[cat.id];
        return copy;
      });
    } finally {
      setCatUploadingId(null);
    }
  };

  const handleRemoveCategoryIcon = async (cat: CategoryConfig) => {
    if (!confirm(`Remove icon for ${cat.label}?`)) return;
    try {
      await updateCategoryConfig(cat.id, { imageUrl: "" });
      await loadCategories();
      alert("Icon removed successfully");
    } catch (err) {
      alert("Failed to remove icon");
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.label) return alert("Please enter a category name");

    setIsCreatingCategory(true);
    try {
      let imageUrl = "";
      if (newCategoryFile) {
        const formData = new FormData();
        formData.append("image", newCategoryFile);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: "POST", body: formData });
        const data = await res.json();
        if (data.success) {
          imageUrl = data.data.url;
        } else {
          console.error("Upload error details:", data);
          throw new Error("Failed to upload image");
        }
      }

      // Fix: Generate a safe ID, fallback to random if name is non-latin (like Sinhala)
      let categoryId = newCategory.label.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (!categoryId) categoryId = "cat-" + Math.random().toString(36).substring(2, 7);

      await addCategoryConfig({
        id: categoryId,
        label: newCategory.label,
        emoji: "", // Removed emoji support
        imageUrl: imageUrl,
        order: categories.length + 1,
        isActive: true,
        ...(newCategory.statusSteps.length > 0 ? { statusSteps: newCategory.statusSteps } : {})
      });

      setShowAddCategoryForm(false);
      setNewCategory({ label: "", statusSteps: [] });
      setNewCategoryFile(null);
      setNewCategoryPreview(null);
      await loadCategories();
    } catch (err: any) {
      alert(err.message || "Failed to create category");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat: CategoryConfig) => {
    if (!confirm(`Are you sure you want to completely delete the category "${cat.label}"?`)) return;
    try {
      await deleteCategoryConfig(cat.id);
      await loadCategories();
      alert("Category deleted successfully!");
    } catch (err: any) {
      alert("Failed to delete category: " + err.message);
    }
  };

  const openEditCategory = (cat: CategoryConfig) => {
    setEditingCategory(cat);
    setEditCatLabel(cat.label);
    setEditCatSteps(cat.statusSteps || []);
  };

  const handleSaveEditCategory = async () => {
    if (!editingCategory) return;
    if (!editCatLabel.trim()) return alert("Category name cannot be empty");
    setIsSavingEdit(true);
    try {
      await updateCategoryConfig(editingCategory.id, {
        label: editCatLabel.trim(),
        statusSteps: editCatSteps,
      });
      setEditingCategory(null);
      await loadCategories();
    } catch (err: any) {
      alert("Failed to update category: " + (err.message || "Unknown error"));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const loadBanners = async () => {
    setIsLoading(true);
    try {
      const data = await getBanners(false);
      setBanners(data);
    } catch (err) {
      console.error("Failed to load banners:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadShops = async () => {
    setIsLoading(true);
    try {
      const data = await getAllShops();
      setShops(data);
    } catch (err) {
      console.error("Failed to load shops:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // 1. Upload to ImgBB
      const formData = new FormData();
      formData.append("image", selectedFile);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        const imageUrl = data.data.url;

        // 2. Save to Firestore
        await addBanner(imageUrl, placement);

        // 3. Reset form and reload
        setPreviewImage(null);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await loadBanners();
        alert("Banner uploaded successfully!");
      } else {
        throw new Error(data.error?.message || "Upload failed");
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(err.message || "Something went wrong during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await toggleBannerStatus(id, !currentStatus);
      await loadBanners();
    } catch (err) {
      console.error("Toggle error:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this banner?")) return;
    try {
      await deleteBanner(id);
      await loadBanners();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingShop(true);
    try {
      await createSellerAccountAndShop({
        name: "Shop Owner", // default
        email: newShop.email,
        password: newShop.password,
        shopName: newShop.shopName,
        address: newShop.address,
        city: newShop.city,
        category: newShop.category,
        phone1: "0000000000", // temp
        role: "seller"
      });
      alert("Shop and Seller Account created successfully!");
      setShowAddShopForm(false);
      setNewShop({ email: "", password: "", shopName: "", address: "", city: SRI_LANKA_CITIES[0], category: "" });
      await loadShops();
    } catch (err: any) {
      console.error("Create shop error:", err);
      alert(err.message || "Failed to create shop");
    } finally {
      setIsCreatingShop(false);
    }
  };

  const startEditingShop = (shop: Shop) => {
    setEditingShopId(shop.id);
    setEditShopForm(shop);

    const loc = locations.find(l => l.city === shop.city);
    if (loc) {
      setEditShopDistrict(loc.district);
      const districtLocs = locations.filter(l => l.district === loc.district);
      setEditShopCities(districtLocs.map(l => l.city).sort());
    } else {
      setEditShopDistrict("");
      setEditShopCities([]);
    }
  };

  const handleUpdateShop = async () => {
    if (!editingShopId || !editShopForm.name) return;
    setIsUpdatingShop(true);
    try {
      await updateShop(editingShopId, editShopForm);
      setEditingShopId(null);
      await loadShops();
    } catch (err) {
      console.error("Update shop error:", err);
      alert("Failed to update shop details.");
    } finally {
      setIsUpdatingShop(false);
    }
  };

  const handleToggleShopOpen = async (shop: Shop) => {
    try {
      await updateShop(shop.id, { isOpen: !shop.isOpen });
      await loadShops();
    } catch (err) {
      console.error("Toggle shop error:", err);
    }
  };

  const handleDeleteShop = async (shopId: string, shopName: string) => {
    if (!window.confirm(`Are you sure you want to delete the shop "${shopName}"? This action cannot be undone.`)) return;
    try {
      await deleteShop(shopId);
      await loadShops();
      alert("Shop deleted successfully.");
    } catch (err) {
      console.error("Delete shop error:", err);
      alert("Failed to delete shop.");
    }
  };

  const handleCreateDeliveryBoy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoy.city) return alert("Please select a city.");
    setIsCreatingBoy(true);
    try {
      await createDeliveryBoyAccount({
        name: newBoy.name,
        email: newBoy.email,
        password: newBoy.password,
        phone1: newBoy.phone1,
        address: newBoy.address,
        city: newBoy.city,
        nic: newBoy.nic,
        dob: newBoy.dob,
        role: "delivery",
      });
      alert("Delivery Boy account created successfully!");
      setShowAddBoyForm(false);
      setNewBoy({ name: "", email: "", password: "", phone1: "", address: "", city: "", nic: "", dob: "" });
      setNewBoyDistrict("");
      await loadDeliveryBoys();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to create delivery boy");
    } finally {
      setIsCreatingBoy(false);
    }
  };

  const openBannerModal = (shop: Shop) => {
    setBannerModalShop(shop);
    setBannerFile(null);
    setBannerPreview(null);
    setBannerError(null);
  };

  const closeBannerModal = () => {
    setBannerModalShop(null);
    setBannerFile(null);
    setBannerPreview(null);
    setBannerError(null);
  };

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerError(null);
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleBannerUpload = async () => {
    if (!bannerFile || !bannerModalShop) return;

    setIsUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append("image", bannerFile);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        await updateShop(bannerModalShop.id, { bannerUrl: data.data.url });
        await loadShops();
        closeBannerModal();
      } else {
        throw new Error(data.error?.message || "Upload failed");
      }
    } catch (err: any) {
      console.error(err);
      setBannerError(err.message || "Failed to upload banner");
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const openLogoModal = (shop: Shop) => {
    setLogoModalShop(shop);
    setLogoFile(null);
    setLogoPreview(null);
    setLogoError(null);
  };

  const closeLogoModal = () => {
    setLogoModalShop(null);
    setLogoFile(null);
    setLogoPreview(null);
    setLogoError(null);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError(null);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoUpload = async () => {
    if (!logoFile || !logoModalShop) return;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("image", logoFile);

      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        await updateShop(logoModalShop.id, { imageUrl: data.data.url });
        await loadShops();
        closeLogoModal();
      } else {
        throw new Error(data.error?.message || "Upload failed");
      }
    } catch (err: any) {
      console.error(err);
      setLogoError(err.message || "Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-logo">Vito Admin</div>
        <nav className="admin-nav">
          <button
            className={`admin-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button
            className={`admin-nav-item ${activeTab === "banners" ? "active" : ""}`}
            onClick={() => setActiveTab("banners")}
          >
            <ImageIcon size={20} /> Banners
          </button>
          <button
            className={`admin-nav-item ${activeTab === "shops" ? "active" : ""}`}
            onClick={() => setActiveTab("shops")}
          >
            <Store size={20} /> Shops
          </button>
          <button
            className={`admin-nav-item ${activeTab === "categories" ? "active" : ""}`}
            onClick={() => setActiveTab("categories")}
          >
            <Box size={20} /> Categories
          </button>
          <button
            className={`admin-nav-item ${activeTab === "locations" ? "active" : ""}`}
            onClick={() => setActiveTab("locations")}
          >
            <MapPin size={20} /> Locations
          </button>
          <button
            className={`admin-nav-item ${activeTab === "items" ? "active" : ""}`}
            onClick={() => setActiveTab("items")}
          >
            <Package size={20} /> Items
          </button>
          <button
            className={`admin-nav-item ${activeTab === "delivery_boys" ? "active" : ""}`}
            onClick={() => setActiveTab("delivery_boys")}
          >
            <Bike size={20} /> Delivery Boys
          </button>
          <button
            className={`admin-nav-item ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            <Users size={20} /> Users
          </button>
          <button
            className={`admin-nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <Settings size={20} /> App Settings
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <h1 className="admin-header-title">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Management
          </h1>
        </header>

        <div className="admin-content">
          {activeTab === "settings" && (
            <div className="admin-card">
              <h2 className="admin-card-title"><Settings size={20} /> OTA App Updates</h2>
              
              <div style={{ marginBottom: 30, background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>Current Live Version: <span style={{ color: "#16a34a" }}>{appConfig?.latestVersion || "Not Set"}</span></h3>
                <p style={{ fontSize: 14, color: "#64748b", marginBottom: 0 }}>
                  Upload a new Next.js `.zip` build below. When saved, all users with the app installed will automatically get a prompt to download and install this new version instantly without going to the Play Store.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 500 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 600 }}>New Version Number (e.g. 1.0.2)</label>
                  <input 
                    type="text" 
                    className="admin-input" 
                    placeholder="1.0.1"
                    value={updateVersionInput}
                    onChange={(e) => setUpdateVersionInput(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ fontSize: 14, fontWeight: 600 }}>Update ZIP File</label>
                  <input 
                    type="file" 
                    accept=".zip"
                    onChange={(e) => setUpdateFile(e.target.files?.[0] || null)}
                    style={{ padding: "10px", border: "1px solid #d1d5db", borderRadius: 8 }}
                  />
                  {updateFile && <span style={{ fontSize: 12, color: "#16a34a" }}>Selected: {updateFile.name}</span>}
                  {!updateFile && appConfig?.updateUrl && <span style={{ fontSize: 12, color: "#6b7280" }}>Current file is active. Upload a new one to replace it.</span>}
                </div>

                <button 
                  className="btn btn-primary" 
                  style={{ padding: 14, marginTop: 10, display: "flex", justifyContent: "center", gap: 8 }}
                  onClick={handleUploadAppUpdate}
                  disabled={isUploadingUpdate}
                >
                  {isUploadingUpdate ? <span className="admin-spinner" style={{ width: 18, height: 18 }}></span> : <Upload size={18} />}
                  {isUploadingUpdate ? "Uploading & Deploying..." : "Deploy Update to All Users"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "banners" && (
            <>
              {/* Upload Section */}
              <div className="admin-card">
                <h2 className="admin-card-title"><Upload size={20} /> Upload New Banner</h2>

                <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  {!previewImage && (
                    <label>
                      <Upload size={32} className="upload-icon" />
                      <span>Click to select an image for the home page banner</span>
                   <span style={{ fontSize: 12, color: '#9ca3af' }}>Recommended: 800×1080px (portrait) for Login Panel | 800×400px (landscape) for Home Banners</span>
                    </label>
                  )}
                </div>

                {previewImage && (
                  <>
                    <div className="upload-preview">
                      <img src={previewImage} alt="Preview" />
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                        Where should this image be displayed?
                      </label>
                      <select
                        value={placement}
                        onChange={(e) => setPlacement(e.target.value as Banner["placement"])}
                        style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
                      >
                        <option value="home_top">Home Page Top Banner</option>
                        <option value="home_middle">Home Page Middle Banner</option>
                        <option value="auth_signup">Customer Signup Page</option>
                        <option value="auth_login">Customer Login Page</option>
                        <option value="auth_panel_image">Login Page — Left Panel Image (PC)</option>
                      </select>
                    </div>
                  </>
                )}

                {previewImage && (
                  <div className="upload-actions">
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setPreviewImage(null);
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      disabled={isUploading}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleUpload}
                      disabled={isUploading}
                    >
                      {isUploading ? <span className="admin-spinner"></span> : <Upload size={16} />}
                      {isUploading ? "Uploading..." : "Save Banner"}
                    </button>
                  </div>
                )}
              </div>

              {/* Banners List */}
              <div className="admin-card">
                <h2 className="admin-card-title"><ImageIcon size={20} /> Active & Past Banners</h2>

                {isLoading ? (
                  <p>Loading banners...</p>
                ) : banners.length === 0 ? (
                  <p style={{ color: '#6b7280' }}>No banners uploaded yet.</p>
                ) : (
                  <div className="banners-grid">
                    {banners.map((banner) => (
                      <div key={banner.id} className="banner-item" style={{ opacity: banner.isActive ? 1 : 0.6 }}>
                        <div className="banner-item-img">
                          <img src={banner.imageUrl} alt="Banner" />
                          <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '10px', padding: '2px 8px', borderRadius: '12px' }}>
                            {banner.placement === "auth_signup" ? "Signup Page" :
                             banner.placement === "auth_login" ? "Login Page" :
                             banner.placement === "auth_panel_image" ? "Login Panel (PC)" :
                             "Home Page"}
                          </div>
                        </div>
                        <div className="banner-item-actions">
                          <label className="toggle-wrapper">
                            <input
                              type="checkbox"
                              checked={banner.isActive}
                              onChange={() => handleToggleStatus(banner.id, banner.isActive)}
                            />
                            {banner.isActive ? "Active" : "Hidden"}
                          </label>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '6px 10px' }}
                            onClick={() => handleDelete(banner.id)}
                            title="Delete Banner"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "shops" && (
            <>
              <div className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="admin-card-title" style={{ margin: 0 }}><Store size={20} /> Shops Management</h2>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddShopForm(!showAddShopForm)}
                >
                  <Plus size={16} /> {showAddShopForm ? "Cancel" : "Add New Shop"}
                </button>
              </div>

              {showAddShopForm && (
                <div className="admin-card">
                  <h3 style={{ marginBottom: 16 }}>Create New Shop & Seller Account</h3>
                  <form className="admin-form" onSubmit={handleCreateShop}>
                    <div className="admin-form-group">
                      <label>Shop Name</label>
                      <input required type="text" value={newShop.shopName} onChange={e => setNewShop({ ...newShop, shopName: e.target.value })} placeholder="e.g. Rasa Bhojanaya" />
                    </div>
                    <div className="admin-form-group">
                      <label>Shop Address</label>
                      <input required type="text" value={newShop.address} onChange={e => setNewShop({ ...newShop, address: e.target.value })} placeholder="e.g. 123 Main St" />
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div className="admin-form-group" style={{ flex: 1 }}>
                        <label>District</label>
                        <select 
                          value={newShopDistrict} 
                          onChange={e => {
                            const dist = e.target.value;
                            setNewShopDistrict(dist);
                            setNewShop({ ...newShop, city: "" });
                            const locs = locations.filter(l => l.district === dist);
                            setNewShopCities(locs.map(l => l.city).sort());
                          }}
                        >
                          <option value="">Select district...</option>
                          {SRI_LANKA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="admin-form-group" style={{ flex: 1 }}>
                        <label>City</label>
                        <select 
                          value={newShop.city} 
                          onChange={e => setNewShop({ ...newShop, city: e.target.value })}
                          disabled={!newShopDistrict}
                        >
                          <option value="">Select city...</option>
                          {newShopCities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="admin-form-group" style={{ flex: 1 }}>
                        <label>Category</label>
                        <select value={newShop.category} onChange={e => setNewShop({ ...newShop, category: e.target.value })}>
                          <option value="">Select category...</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />
                    <h4 style={{ margin: 0, color: '#4b5563' }}>Seller Account Details</h4>

                    <div className="admin-form-group">
                      <label>Owner Email</label>
                      <input required type="email" value={newShop.email} onChange={e => setNewShop({ ...newShop, email: e.target.value })} placeholder="seller@example.com" />
                    </div>
                    <div className="admin-form-group">
                      <label>Temporary Password</label>
                      <input required type="text" value={newShop.password} onChange={e => setNewShop({ ...newShop, password: e.target.value })} placeholder="Min 6 characters" />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <button type="submit" className="btn btn-primary" disabled={isCreatingShop}>
                        {isCreatingShop ? "Creating..." : "Create Shop"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="admin-card">
                <h3 style={{ marginBottom: 16 }}>Registered Shops</h3>
                {isLoading ? (
                  <p>Loading shops...</p>
                ) : shops.length === 0 ? (
                  <p style={{ color: '#6b7280' }}>No shops registered yet.</p>
                ) : (
                  <div className="shops-list">
                    {shops.map(shop => (
                      <div key={shop.id} className="admin-shop-card">
                        {editingShopId === shop.id ? (
                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', gap: 12 }}>
                              <input
                                className="admin-form-group input"
                                style={{ flex: 1, padding: 8 }}
                                value={editShopForm.name || ""}
                                onChange={e => setEditShopForm({ ...editShopForm, name: e.target.value })}
                                placeholder="Shop Name"
                              />
                              <input
                                className="admin-form-group input"
                                style={{ flex: 1, padding: 8 }}
                                value={editShopForm.address || ""}
                                onChange={e => setEditShopForm({ ...editShopForm, address: e.target.value })}
                                placeholder="Address"
                              />
                            </div>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                              <select
                                className="admin-form-group select"
                                style={{ flex: 1, padding: 8 }}
                                value={editShopDistrict}
                                onChange={e => {
                                  const dist = e.target.value;
                                  setEditShopDistrict(dist);
                                  setEditShopForm({ ...editShopForm, city: "" });
                                  const locs = locations.filter(l => l.district === dist);
                                  setEditShopCities(locs.map(l => l.city).sort());
                                }}
                              >
                                <option value="">District...</option>
                                {SRI_LANKA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                              <select
                                className="admin-form-group select"
                                style={{ flex: 1, padding: 8 }}
                                value={editShopForm.city || ""}
                                onChange={e => setEditShopForm({ ...editShopForm, city: e.target.value })}
                                disabled={!editShopDistrict}
                              >
                                <option value="">City...</option>
                                {editShopCities.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <select
                                className="admin-form-group select"
                                style={{ flex: 1, padding: 8 }}
                                value={editShopForm.category || ""}
                                onChange={e => setEditShopForm({ ...editShopForm, category: e.target.value })}
                              >
                                <option value="">Select category...</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                              </select>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, flex: 1 }}>
                                <input
                                  type="checkbox"
                                  checked={editShopForm.isApproved || false}
                                  onChange={e => setEditShopForm({ ...editShopForm, isApproved: e.target.checked })}
                                />
                                Approved
                              </label>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                              <button className="btn btn-secondary" onClick={() => setEditingShopId(null)} disabled={isUpdatingShop}>
                                <X size={14} /> Cancel
                              </button>
                              <button className="btn btn-primary" onClick={handleUpdateShop} disabled={isUpdatingShop}>
                                {isUpdatingShop ? "Saving..." : <><Save size={14} /> Save</>}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="admin-shop-info" style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                                <h3 style={{ margin: 0 }}>{shop.name}</h3>
                                <label className="shop-toggle" style={{ fontSize: 11, cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={shop.isOpen}
                                    onChange={() => handleToggleShopOpen(shop)}
                                  />
                                  <span className="shop-toggle-slider"></span>
                                  <span className={`shop-toggle-label ${shop.isOpen ? 'open' : 'closed'}`}>
                                    {shop.isOpen ? "Open" : "Closed"}
                                  </span>
                                </label>
                              </div>
                              <p>{shop.address}, {shop.city}</p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                              <div style={{ textAlign: 'right', fontSize: 13, color: '#6b7280' }}>
                                <div>Category: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{shop.category}</span></div>
                                <div style={{ color: shop.isApproved ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                                  {shop.isApproved ? "Approved" : "Pending Approval"}
                                </div>
                              </div>
                              {/* Current logo thumbnail */}
                              {shop.imageUrl && (
                                <img
                                  src={shop.imageUrl}
                                  alt="Logo"
                                  className="shop-banner-thumb"
                                  style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }}
                                  title="Current logo"
                                />
                              )}
                              <button
                                onClick={() => openLogoModal(shop)}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}
                                title="Upload Shop Logo"
                              >
                                <ImageIcon size={15} />
                                {shop.imageUrl ? 'Logo' : 'Add Logo'}
                              </button>
                              
                              {/* Current banner thumbnail */}
                              {shop.bannerUrl && (
                                <img
                                  src={shop.bannerUrl}
                                  alt="Banner"
                                  className="shop-banner-thumb"
                                  title="Current banner"
                                />
                              )}
                              <button
                                onClick={() => openBannerModal(shop)}
                                className="btn btn-secondary"
                                style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600 }}
                                title="Upload Shop Banner"
                              >
                                <ImageIcon size={15} />
                                {shop.bannerUrl ? 'Banner' : 'Add Banner'}
                              </button>
                              <button onClick={() => startEditingShop(shop)} className="btn btn-secondary" style={{ padding: '6px 10px' }} title="Edit Shop">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => handleDeleteShop(shop.id, shop.name)} className="btn btn-secondary" style={{ padding: '6px 10px', color: '#ef4444', borderColor: '#fee2e2', backgroundColor: '#fef2f2' }} title="Delete Shop">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "categories" && (
            <div className="admin-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 className="admin-card-title" style={{ margin: 0 }}><ImageIcon size={20} /> Category Icons</h2>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddCategoryForm(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={16} /> New Category
                </button>
              </div>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                Add new categories and upload custom icon images. Recommended: square images (e.g. 200×200px).
              </p>

              {/* New Category Modal */}
              {showAddCategoryForm && (
                <div style={{ background: '#f9fafb', padding: 20, borderRadius: 12, marginBottom: 20, border: '1px solid #e5e7eb' }}>
                  <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 16 }}>Create New Category</h3>
                  <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Category Name (e.g., Food, Grocery)</label>
                      <input
                        type="text"
                        required
                        className="admin-input"
                        value={newCategory.label}
                        onChange={e => setNewCategory({ ...newCategory, label: e.target.value })}
                        placeholder="Enter category name"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Status Steps (Optional)</label>
                      <div style={{ display: 'flex', gap: 16 }}>
                        {["Cooking", "Packing"].map(step => (
                          <label key={step} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={newCategory.statusSteps.includes(step)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewCategory({ ...newCategory, statusSteps: [...newCategory.statusSteps, step] });
                                } else {
                                  setNewCategory({ ...newCategory, statusSteps: newCategory.statusSteps.filter(s => s !== step) });
                                }
                              }}
                            />
                            {step}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Category Icon (Image)</label>
                      {newCategoryPreview && (
                        <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '2px solid #e5e7eb', marginBottom: 10 }}>
                          <img src={newCategoryPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="admin-input"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setNewCategoryFile(file);
                            setNewCategoryPreview(URL.createObjectURL(file));
                          } else {
                            setNewCategoryFile(null);
                            setNewCategoryPreview(null);
                          }
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setShowAddCategoryForm(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={isCreatingCategory}>
                        {isCreatingCategory ? "Creating..." : "Save Category"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {isLoading ? (
                <p>Loading categories...</p>
              ) : categories.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', background: '#f9fafb', borderRadius: 12, color: '#6b7280' }}>
                  <ImageIcon size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
                  <p>No categories found. Create one above.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16 }}>
                  {categories.map(cat => (
                    <div key={cat.id} style={{
                      background: '#f9fafb', borderRadius: 16, padding: 16,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                      border: '1.5px solid #e5e7eb'
                    }}>
                      {/* Icon preview */}
                      <div style={{
                        width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
                        background: '#f3f4f6', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 32, border: '2px solid #e5e7eb'
                      }}>
                        {catPreviews[cat.id] || cat.imageUrl
                          ? <img src={catPreviews[cat.id] || cat.imageUrl} alt={cat.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <Box size={28} color="#9ca3af" />
                        }
                      </div>
                      <p style={{ fontWeight: 700, fontSize: 13, color: '#1f2937', margin: 0 }}>{cat.label}</p>
                      {/* Edit button */}
                      <button
                        className="btn"
                        style={{ width: '100%', fontSize: 12, padding: '4px 8px', background: '#e0e7ff', color: '#3730a3', border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                        onClick={() => openEditCategory(cat)}
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      {/* Upload button */}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        ref={el => { catInputRefs.current[cat.id] = el; }}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCatPreviews(prev => ({ ...prev, [cat.id]: URL.createObjectURL(file) }));
                            handleCategoryIconUpload(cat, file);
                          }
                        }}
                      />
                      <button
                        className="btn btn-secondary"
                        style={{ width: '100%', fontSize: 12, padding: '6px 8px' }}
                        onClick={() => catInputRefs.current[cat.id]?.click()}
                        disabled={catUploadingId === cat.id}
                      >
                        {catUploadingId === cat.id ? 'Uploading...' : cat.imageUrl ? '🔄 Replace Icon' : '⬆ Upload Icon'}
                      </button>
                      {cat.imageUrl ? (
                        <button
                          className="btn"
                          style={{ width: '100%', fontSize: 12, padding: '4px 8px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                          onClick={() => handleRemoveCategoryIcon(cat)}
                        >
                          🗑 Remove Icon
                        </button>
                      ) : (
                        <button
                          className="btn"
                          style={{ width: '100%', fontSize: 12, padding: '4px 8px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 8, cursor: 'pointer', marginTop: 'auto' }}
                          onClick={() => handleDeleteCategory(cat)}
                        >
                          🗑 Delete Category
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Edit Category Modal */}
              {editingCategory && (
                <div className="banner-modal-overlay" onClick={() => setEditingCategory(null)}>
                  <div className="banner-modal" onClick={e => e.stopPropagation()} style={{
                    maxWidth: 440, borderRadius: 20, padding: 0, overflow: 'hidden',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.3)', border: 'none'
                  }}>
                    {/* Header with gradient */}
                    <div style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 14
                    }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: 16, overflow: 'hidden',
                        background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)'
                      }}>
                        {editingCategory.imageUrl
                          ? <img src={editingCategory.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <Box size={24} color="#fff" />
                        }
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff' }}>Edit Category</h3>
                        <p style={{ margin: '2px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>Update name & settings</p>
                      </div>
                      <button onClick={() => setEditingCategory(null)} style={{
                        background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
                        borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', transition: 'background 0.2s'
                      }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
                      >
                        <X size={16} color="#fff" />
                      </button>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '24px 28px 28px' }}>
                      <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category Name</label>
                        <input
                          type="text"
                          className="admin-input"
                          value={editCatLabel}
                          onChange={e => setEditCatLabel(e.target.value)}
                          placeholder="Category name"
                          style={{ borderRadius: 12, padding: '12px 14px', fontSize: 14, border: '2px solid #e5e7eb', transition: 'border-color 0.2s', width: '100%', boxSizing: 'border-box' }}
                          onFocus={e => (e.currentTarget.style.borderColor = '#667eea')}
                          onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
                        />
                      </div>

                      <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status Steps</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                          {["Cooking", "Packing"].map(step => {
                            const isChecked = editCatSteps.includes(step);
                            return (
                              <label key={step} style={{
                                display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                                cursor: 'pointer', padding: '8px 16px', borderRadius: 10,
                                border: isChecked ? '2px solid #667eea' : '2px solid #e5e7eb',
                                background: isChecked ? '#eef2ff' : '#f9fafb',
                                fontWeight: isChecked ? 600 : 400, color: isChecked ? '#4338ca' : '#6b7280',
                                transition: 'all 0.2s'
                              }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setEditCatSteps([...editCatSteps, step]);
                                    } else {
                                      setEditCatSteps(editCatSteps.filter(s => s !== step));
                                    }
                                  }}
                                  style={{ display: 'none' }}
                                />
                                <div style={{
                                  width: 18, height: 18, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  background: isChecked ? '#667eea' : '#d1d5db', transition: 'background 0.2s'
                                }}>
                                  {isChecked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                                {step}
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button onClick={() => setEditingCategory(null)} style={{
                          padding: '10px 20px', borderRadius: 10, border: '2px solid #e5e7eb',
                          background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.2s'
                        }}>
                          Cancel
                        </button>
                        <button onClick={handleSaveEditCategory} disabled={isSavingEdit} style={{
                          padding: '10px 24px', borderRadius: 10, border: 'none',
                          background: isSavingEdit ? '#a5b4fc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: '#fff', fontSize: 13, fontWeight: 600, cursor: isSavingEdit ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s',
                          boxShadow: '0 4px 14px rgba(102,126,234,0.4)'
                        }}>
                          <Save size={14} />
                          {isSavingEdit ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "locations" && (
            <div className="admin-card">
              <h2 className="admin-card-title"><MapPin size={20} /> Delivery Locations</h2>
              
              <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr', marginBottom: '40px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', background: '#f9fafb', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4b5563', marginBottom: '8px' }}>Select District</label>
                    <select
                      className="admin-input"
                      value={newLocDistrict}
                      onChange={(e) => setNewLocDistrict(e.target.value)}
                      style={{ margin: 0 }}
                    >
                      <option value="" disabled>-- Select District --</option>
                      {SRI_LANKA_DISTRICTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: '1', minWidth: '200px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#4b5563', marginBottom: '8px' }}>City Name</label>
                    <input
                      type="text"
                      className="admin-input"
                      placeholder="e.g. Kuliyapitiya"
                      value={newLocCity}
                      onChange={(e) => setNewLocCity(e.target.value)}
                      style={{ margin: 0 }}
                    />
                  </div>
                  <button 
                    onClick={handleAddLocation} 
                    disabled={isAddingLocation || !newLocDistrict || !newLocCity.trim()}
                    style={{ 
                      background: '#15803d', color: 'white', border: 'none', padding: '12px 24px', 
                      borderRadius: '8px', fontWeight: '600', cursor: 'pointer', height: '42px',
                      opacity: (isAddingLocation || !newLocDistrict || !newLocCity.trim()) ? 0.5 : 1
                    }}
                  >
                    {isAddingLocation ? "Adding..." : "Add Now"}
                  </button>
                </div>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '20px', color: '#1f2937' }}>Saved Locations</h3>
              {isLoading ? (
                <p>Loading locations...</p>
              ) : locations.length === 0 ? (
                <p style={{ color: '#6b7280' }}>No locations added yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                  {locations.map(loc => (
                    <div key={loc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '15px', borderRadius: '10px', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div>
                        <p style={{ fontWeight: 'bold', color: '#111827', margin: 0 }}>{loc.city}</p>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, marginTop: '4px' }}>{loc.district} District</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteLocation(loc.id)}
                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}
                        title="Delete City"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "items" && (
            <div className="admin-card">
              <h2 className="admin-card-title"><Package size={20} /> All Items / Products</h2>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
                Manage all platform items. Turn items off to hide them from customers.
              </p>

              {isLoading ? (
                <p>Loading items...</p>
              ) : products.length === 0 ? (
                <p style={{ color: '#6b7280' }}>No items found.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {products.map(product => (
                    <div key={product.id} style={{
                      background: 'white', borderRadius: 12, padding: 16,
                      border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 12,
                      opacity: product.isAvailable ? 1 : 0.6
                    }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={24} color="#9ca3af" />
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, fontSize: 14, color: '#111827' }}>{product.name}</h4>
                          <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Rs. {product.price}</p>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: product.isAvailable ? '#10b981' : '#ef4444' }}>
                          {product.isAvailable ? 'Visible' : 'Hidden'}
                        </span>
                        <label className="shop-toggle" style={{ fontSize: 11, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={product.isAvailable}
                            onChange={() => handleToggleProductStatus(product.id, product.isAvailable)}
                          />
                          <span className="shop-toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "delivery_boys" && (
            <>
              <div className="admin-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="admin-card-title" style={{ margin: 0 }}><Bike size={20} /> Delivery Boys Management</h2>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddBoyForm(!showAddBoyForm)}
                >
                  <Plus size={16} /> {showAddBoyForm ? "Cancel" : "Create New Boy"}
                </button>
              </div>

              {showAddBoyForm && (
                <div className="admin-card">
                  <h3 style={{ marginBottom: 16 }}>Create New Delivery Boy Account</h3>
                  <form className="admin-form" onSubmit={handleCreateDeliveryBoy}>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div className="admin-form-group" style={{ flex: 1 }}>
                        <label>Full Name</label>
                        <input required type="text" value={newBoy.name} onChange={e => setNewBoy({ ...newBoy, name: e.target.value })} placeholder="e.g. Kasun Perera" />
                      </div>
                      <div className="admin-form-group" style={{ flex: 1 }}>
                        <label>Phone Number</label>
                        <input required type="text" value={newBoy.phone1} onChange={e => setNewBoy({ ...newBoy, phone1: e.target.value })} placeholder="07XXXXXXXX" />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 16 }}>
                      <div className="admin-form-group" style={{ flex: 1 }}>
                        <label>NIC Number</label>
                        <input required type="text" value={newBoy.nic} onChange={e => setNewBoy({ ...newBoy, nic: e.target.value })} placeholder="e.g. 199XXXXXXXXX" />
                      </div>
                      <div className="admin-form-group" style={{ flex: 1 }}>
                        <label>Date of Birth</label>
                        <input required type="date" value={newBoy.dob} onChange={e => setNewBoy({ ...newBoy, dob: e.target.value })} />
                      </div>
                    </div>

                    <div className="admin-form-group">
                      <label>Address</label>
                      <input required type="text" value={newBoy.address} onChange={e => setNewBoy({ ...newBoy, address: e.target.value })} placeholder="e.g. 123 Main St" />
                    </div>

                    <div style={{ display: 'flex', gap: 16 }}>
                      <div className="admin-form-group" style={{ flex: 1 }}>
                        <label>District</label>
                        <select 
                          value={newBoyDistrict} 
                          onChange={e => {
                            const dist = e.target.value;
                            setNewBoyDistrict(dist);
                            setNewBoy({ ...newBoy, city: "" });
                            const locs = locations.filter(l => l.district === dist);
                            setNewBoyCities(locs.map(l => l.city).sort());
                          }}
                        >
                          <option value="">Select district...</option>
                          {SRI_LANKA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div className="admin-form-group" style={{ flex: 1 }}>
                        <label>City (Orders from this city only)</label>
                        <select 
                          required
                          value={newBoy.city} 
                          onChange={e => setNewBoy({ ...newBoy, city: e.target.value })}
                          disabled={!newBoyDistrict}
                        >
                          <option value="">Select city...</option>
                          {newBoyCities.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '8px 0' }} />
                    <h4 style={{ margin: 0, color: '#4b5563' }}>Login Details</h4>

                    <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                      <div className="admin-form-group" style={{ flex: 1 }}>
                        <label>Email</label>
                        <input required type="email" value={newBoy.email} onChange={e => setNewBoy({ ...newBoy, email: e.target.value })} placeholder="boy@vitodelivery.com" />
                      </div>
                      <div className="admin-form-group" style={{ flex: 1 }}>
                        <label>Password</label>
                        <input required type="text" value={newBoy.password} onChange={e => setNewBoy({ ...newBoy, password: e.target.value })} placeholder="Min 6 characters" />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <button type="submit" className="btn btn-primary" disabled={isCreatingBoy}>
                        {isCreatingBoy ? "Creating..." : "Create Account"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="admin-card">
                <h3 style={{ marginBottom: 16 }}>Registered Delivery Boys</h3>
                {isLoading ? (
                  <p>Loading...</p>
                ) : deliveryBoys.length === 0 ? (
                  <p style={{ color: '#6b7280' }}>No delivery boys registered yet.</p>
                ) : (
                  <div className="shops-list">
                    {deliveryBoys.map(boy => (
                      <div key={boy.uid} className="admin-shop-card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: 16 }}>{boy.name}</h4>
                            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{boy.email}</p>
                          </div>
                          <div style={{ background: '#ecfdf5', color: '#059669', padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                            {boy.city}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: '#4b5563' }}>
                          <span>📞 {boy.phone1}</span>
                          <span>🏠 {boy.address}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab !== "banners" && activeTab !== "shops" && activeTab !== "categories" && activeTab !== "locations" && activeTab !== "items" && activeTab !== "delivery_boys" && (
            <div className="admin-card">
              <p>This module is under development.</p>
            </div>
          )}
        </div>
      </main>

      {bannerModalShop && (
        <div className="banner-modal-overlay" onClick={closeBannerModal}>
          <div className="banner-modal" onClick={(e) => e.stopPropagation()}>
            <div className="banner-modal-header">
              <h3>Shop Banner - {bannerModalShop.name}</h3>
              <button className="banner-modal-close" onClick={closeBannerModal}>
                <X size={20} />
              </button>
            </div>

            <div className="banner-modal-body">
              {bannerModalShop.bannerUrl && !bannerPreview && (
                <div className="banner-current">
                  <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Current Banner</p>
                  <img src={bannerModalShop.bannerUrl} alt="Current banner" />
                </div>
              )}

              {bannerPreview && (
                <div className="banner-preview">
                  <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>New Banner Preview</p>
                  <img src={bannerPreview} alt="Preview" />
                </div>
              )}

              {bannerError && (
                <div className="banner-error">{bannerError}</div>
              )}

              <div className="banner-upload-area">
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                  Recommended: 800×300px or wider (landscape format)
                </p>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerFileChange}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 12 }}
                onClick={handleBannerUpload}
                disabled={!bannerFile || isUploadingBanner}
              >
                {isUploadingBanner ? "Uploading..." : "Upload Banner"}
              </button>
            </div>
          </div>
        </div>
      )}

      {logoModalShop && (
        <div className="banner-modal-overlay" onClick={closeLogoModal}>
          <div className="banner-modal" onClick={(e) => e.stopPropagation()}>
            <div className="banner-modal-header">
              <h3>Shop Logo - {logoModalShop.name}</h3>
              <button className="banner-modal-close" onClick={closeLogoModal}>
                <X size={20} />
              </button>
            </div>

            <div className="banner-modal-body">
              {logoModalShop.imageUrl && !logoPreview && (
                <div className="banner-current" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Current Logo</p>
                  <img src={logoModalShop.imageUrl} alt="Current logo" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover' }} />
                </div>
              )}

              {logoPreview && (
                <div className="banner-preview" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>New Logo Preview</p>
                  <img src={logoPreview} alt="Preview" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover' }} />
                </div>
              )}

              {logoError && (
                <div className="banner-error">{logoError}</div>
              )}

              <div className="banner-upload-area">
                <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                  Recommended: 200×200px or square format
                </p>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                />
              </div>

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 12 }}
                onClick={handleLogoUpload}
                disabled={!logoFile || isUploadingLogo}
              >
                {isUploadingLogo ? "Uploading..." : "Upload Logo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
