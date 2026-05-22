// ============================================
// VITO DELIVERY - Firestore Database Service
// ============================================
// Collection structure:
//   users/{uid}         → user profile (role, city, etc.)
//   shops/{shopId}      → shop data (city-based)
//   orders/{orderId}    → order data
//   categories/{catId}  → shop categories

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
  Timestamp,
  addDoc,
  deleteDoc,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";

/* ============================================
   TYPES
   ============================================ */

export type UserRole = "customer" | "seller" | "delivery" | "admin";

export interface VitoUser {
  uid: string;
  name: string;
  email: string;
  phone1: string;
  phone2?: string;
  address: string;
  city: string;
  role: UserRole;
  shopId?: string;       // for sellers
  isActive: boolean;
  nic?: string;          // for delivery boys
  dob?: string;          // for delivery boys
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Shop {
  id: string;
  name: string;
  ownerId: string;       // seller uid
  category: string;
  city: string;
  address: string;
  phone: string;
  description?: string;
  imageUrl?: string;
  bannerUrl?: string;    // shop banner image (set by admin)
  emoji?: string;
  isOpen: boolean;
  isApproved: boolean;   // admin approval
  rating: number;
  reviewCount: number;
  deliveryFee: number;
  deliveryTime: string;  // e.g. "20-30"
  tags: string[];
  lat?: number;
  lng?: number;
  createdAt: Timestamp | null;
}

export interface ProductVariation {
  name: string;
  price: number;
  imageUrl?: string;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  category?: string;
  variations?: ProductVariation[];
  unit?: string;
  amount?: string;
  createdAt: Timestamp | null;
}

export interface Order {
  id: string;
  customerId: string;
  shopId: string;
  shopName: string;
  deliveryBoyId?: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryFee: number;
  deliveryAddress: string;
  city: string;
  status: "pending" | "confirmed" | "preparing" | "picked_up" | "delivered" | "cancelled";
  preparationStatus?: string;   // e.g. "Cooking", "Packing"
  estimatedTime?: string;       // e.g. "15 min"
  note?: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Banner {
  id: string;
  imageUrl: string;
  isActive: boolean;
  placement?: "home_top" | "home_middle" | "auth_signup" | "auth_login" | "auth_panel_image";
  createdAt: Timestamp | null;
}

export interface Location {
  id: string;
  district: string;
  city: string;
  createdAt: Timestamp | null;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;      // 1-5
  comment: string;
  createdAt: Timestamp | null;
}

export interface CategoryConfig {
  id: string;          // matches the category key e.g. "food", "grocery"
  label: string;
  imageUrl?: string;   // admin-uploaded icon image
  emoji: string;       // fallback emoji
  order: number;       // display order
  isActive: boolean;
  statusSteps?: string[];  // e.g. ["Cooking", "Packing"] for food category
}

/* ============================================
   USER SERVICES
   ============================================ */

/** Create a new user profile in Firestore after registration */
export async function createUserProfile(uid: string, data: Omit<VitoUser, "uid" | "createdAt" | "updatedAt">) {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    ...data,
    uid,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Get user profile by UID */
export async function getUserProfile(uid: string): Promise<VitoUser | null> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  return snap.data() as VitoUser;
}

/** Update user profile fields */
export async function updateUserProfile(uid: string, data: Partial<VitoUser>) {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Get users by role */
export async function getUsersByRole(role: UserRole): Promise<VitoUser[]> {
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("role", "==", role));
  const snap = await getDocs(q);
  const users = snap.docs.map(d => d.data() as VitoUser);
  users.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return users;
}

/* ============================================
   SHOP SERVICES
   ============================================ */

/** Get all approved shops for a given city */
export async function getShopsByCity(city: string): Promise<Shop[]> {
  const shopsRef = collection(db, "shops");
  const q = query(
    shopsRef,
    where("city", "==", city),
    where("isApproved", "==", true),
    orderBy("rating", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Shop));
}

/** Get shops by city + category */
export async function getShopsByCityAndCategory(city: string, category: string): Promise<Shop[]> {
  const shopsRef = collection(db, "shops");
  const q = query(
    shopsRef,
    where("city", "==", city),
    where("category", "==", category),
    where("isApproved", "==", true),
    orderBy("rating", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Shop));
}

/** Get all shops (Admin only) */
export async function getAllShops(): Promise<Shop[]> {
  const shopsRef = collection(db, "shops");
  // Fetch all shops ordered by creation date
  const q = query(shopsRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Shop));
}

/** Get single shop by ID */
export async function getShopById(shopId: string): Promise<Shop | null> {
  const shopRef = doc(db, "shops", shopId);
  const snap = await getDoc(shopRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Shop;
}

/** Get shop by owner ID (for Seller Dashboard) */
export async function getShopByOwnerId(ownerId: string): Promise<Shop | null> {
  const shopsRef = collection(db, "shops");
  const q = query(shopsRef, where("ownerId", "==", ownerId), limit(1));
  const snap = await getDocs(q);

  if (snap.empty) {
    // FALLBACK for development: If no shop is explicitly linked to this seller,
    // we return the first available shop so they can test the dashboard.
    const fallbackQ = query(shopsRef, limit(1));
    const fallbackSnap = await getDocs(fallbackQ);
    if (fallbackSnap.empty) return null;
    return { id: fallbackSnap.docs[0].id, ...fallbackSnap.docs[0].data() } as Shop;
  }

  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Shop;
}

/** Create a new shop (called during seller registration) */
export async function createShop(data: Omit<Shop, "id" | "createdAt" | "rating" | "reviewCount" | "isApproved">, autoApprove: boolean = false) {
  const shopsRef = collection(db, "shops");
  const docRef = await addDoc(shopsRef, {
    ...data,
    rating: 0,
    reviewCount: 0,
    isApproved: autoApprove,    // Admin can auto-approve
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Update shop details */
export async function updateShop(shopId: string, data: Partial<Shop>) {
  const shopRef = doc(db, "shops", shopId);
  await updateDoc(shopRef, data);
}

/** Delete a shop */
export async function deleteShop(shopId: string) {
  const shopRef = doc(db, "shops", shopId);
  await deleteDoc(shopRef);
}

/* ============================================
   PRODUCT SERVICES
   ============================================ */

/** Get all products for a given shop */
export async function getProductsByShop(shopId: string): Promise<Product[]> {
  const productsRef = collection(db, "products");
  const q = query(productsRef, where("shopId", "==", shopId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
}

/** Get all products across all shops (Admin only) */
export async function getAllProducts(): Promise<Product[]> {
  const productsRef = collection(db, "products");
  const q = query(productsRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
}

/** Get a single product by ID */
export async function getProductById(productId: string): Promise<Product | null> {
  const docRef = doc(db, "products", productId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Product;
}

/** Add a new product to a shop */
export async function addProduct(data: Omit<Product, "id" | "createdAt">) {
  const productsRef = collection(db, "products");
  const docRef = await addDoc(productsRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Update an existing product */
export async function updateProduct(productId: string, data: Partial<Omit<Product, "id" | "createdAt">>) {
  const productRef = doc(db, "products", productId);
  await updateDoc(productRef, data);
}

/** Delete a product */
export async function deleteProduct(productId: string) {
  const productRef = doc(db, "products", productId);
  await deleteDoc(productRef);
}

/* ============================================
   REVIEW SERVICES
   ============================================ */

/** Get all reviews for a product */
export async function getReviewsByProduct(productId: string): Promise<Review[]> {
  const ref = collection(db, "reviews");
  const q = query(ref, where("productId", "==", productId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Review));
}

/** Add a review for a product */
export async function addReview(data: Omit<Review, "id" | "createdAt">) {
  const ref = collection(db, "reviews");
  const docRef = await addDoc(ref, { ...data, createdAt: serverTimestamp() });
  return docRef.id;
}

/* ============================================
   APP UPDATE CONFIG
   ============================================ */

export const getAppUpdateConfig = async () => {
  const { doc, getDoc } = await import("firebase/firestore");
  const snap = await getDoc(doc(db, "app_config", "updates"));
  if (snap.exists()) {
    return snap.data() as { latestVersion: string; updateUrl: string };
  }
  return null;
};

export const setAppUpdateConfig = async (latestVersion: string, updateUrl: string) => {
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db, "app_config", "updates"), {
    latestVersion,
    updateUrl,
  }, { merge: true });
};

/** Create a new order */
export async function createOrder(data: Omit<Order, "id" | "createdAt" | "updatedAt" | "status">) {
  const ordersRef = collection(db, "orders");
  const docRef = await addDoc(ordersRef, {
    ...data,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Get orders for a customer */
export async function getCustomerOrders(customerId: string): Promise<Order[]> {
  const ordersRef = collection(db, "orders");
  const q = query(
    ordersRef,
    where("customerId", "==", customerId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
}

/** Get orders for a shop (seller view) */
export async function getShopOrders(shopId: string): Promise<Order[]> {
  const ordersRef = collection(db, "orders");
  const q = query(
    ordersRef,
    where("shopId", "==", shopId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
}

/** Get orders for a specific city (for delivery boys) */
export async function getOrdersByCity(city: string): Promise<Order[]> {
  const ordersRef = collection(db, "orders");
  const q = query(
    ordersRef,
    where("city", "==", city),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
}

/** Update order status */
export async function updateOrderStatus(orderId: string, status: Order["status"], deliveryBoyId?: string) {
  const orderRef = doc(db, "orders", orderId);
  await updateDoc(orderRef, {
    status,
    ...(deliveryBoyId ? { deliveryBoyId } : {}),
    updatedAt: serverTimestamp(),
  });
}

/** Update order preparation status and time */
export async function updateOrderPreparation(orderId: string, data: { status: Order["status"]; preparationStatus?: string; estimatedTime?: string }) {
  const orderRef = doc(db, "orders", orderId);
  await updateDoc(orderRef, {
    status: data.status,
    ...(data.preparationStatus ? { preparationStatus: data.preparationStatus } : {}),
    ...(data.estimatedTime ? { estimatedTime: data.estimatedTime } : {}),
    updatedAt: serverTimestamp(),
  });
}

/* ============================================
   BANNER SERVICES
   ============================================ */

/** Get all banners */
export async function getBanners(onlyActive: boolean = true, placement?: Banner["placement"]): Promise<Banner[]> {
  const bannersRef = collection(db, "banners");
  // Fetch all ordered by createdAt to avoid needing a composite index
  const q = query(bannersRef, orderBy("createdAt", "desc"));

  const snap = await getDocs(q);
  let allBanners = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Banner));

  if (onlyActive) {
    allBanners = allBanners.filter(b => b.isActive === true);
  }

  if (placement) {
    allBanners = allBanners.filter(b => b.placement === placement || (!b.placement && placement === "home_top"));
  }

  return allBanners;
}

/** Add a new banner */
export async function addBanner(imageUrl: string, placement: Banner["placement"] = "home_top") {
  const bannersRef = collection(db, "banners");
  const docRef = await addDoc(bannersRef, {
    imageUrl,
    placement,
    isActive: true,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Toggle banner active status */
export async function toggleBannerStatus(bannerId: string, isActive: boolean) {
  const bannerRef = doc(db, "banners", bannerId);
  await updateDoc(bannerRef, { isActive });
}

/** Delete a banner completely */
export async function deleteBanner(bannerId: string) {
  const { deleteDoc } = await import("firebase/firestore");
  const bannerRef = doc(db, "banners", bannerId);
  await deleteDoc(bannerRef);
}

/* ============================================
   CATEGORY CONFIG SERVICES
   ============================================ */

/** Get all categories from Firestore */
export async function getCategoryConfigs(): Promise<CategoryConfig[]> {
  const { getDocsFromServer } = await import("firebase/firestore");
  const ref = collection(db, "category_configs");
  const snap = await getDocsFromServer(ref);
  const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as CategoryConfig));
  return data.sort((a, b) => (a.order || 0) - (b.order || 0));
}

/** Add a new category */
export async function addCategoryConfig(data: CategoryConfig) {
  const ref = doc(db, "category_configs", data.id);
  await setDoc(ref, data);
  return data.id;
}

/** Update a category config */
export async function updateCategoryConfig(categoryId: string, data: Partial<CategoryConfig>) {
  const ref = doc(db, "category_configs", categoryId);
  console.log(`Updating category ${categoryId} with data:`, data);
  try {
    await setDoc(ref, data, { merge: true });
    console.log(`Category ${categoryId} updated successfully!`);
  } catch (error) {
    console.error(`Failed to update category ${categoryId}:`, error);
    throw error;
  }
}

/** Delete a category completely */
export async function deleteCategoryConfig(categoryId: string) {
  const ref = doc(db, "category_configs", categoryId);
  await deleteDoc(ref);
}

/* ============================================
   LOCATIONS
   ============================================ */

export const addLocation = async (district: string, city: string) => {
  const { addDoc, collection, serverTimestamp } = await import("firebase/firestore");
  const docRef = await addDoc(collection(db, "locations"), {
    district,
    city,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getLocations = async (): Promise<Location[]> => {
  const { collection, getDocs } = await import("firebase/firestore");
  const snap = await getDocs(collection(db, "locations"));
  const locations = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location));

  // Sort locally by district then city to avoid Firestore index requirements
  return locations.sort((a, b) => {
    if (a.district === b.district) {
      return a.city.localeCompare(b.city);
    }
    return a.district.localeCompare(b.district);
  });
};

export const deleteLocation = async (id: string) => {
  const { deleteDoc, doc } = await import("firebase/firestore");
  await deleteDoc(doc(db, "locations", id));
};

/** Get cities for a specific district from Firestore */
export const getLocationsByDistrict = async (district: string): Promise<Location[]> => {
  const { collection, getDocs, query, where } = await import("firebase/firestore");
  const q = query(collection(db, "locations"), where("district", "==", district));
  const snap = await getDocs(q);
  const cities = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location));
  return cities.sort((a, b) => a.city.localeCompare(b.city));
};

/** Get all products from all shops in a specific city */
export async function getAllProductsByCity(city: string): Promise<(Product & { shopName: string; shopImageUrl?: string })[]> {
  const shops = await getShopsByCity(city);
  if (shops.length === 0) return [];

  const productsPromises = shops.map(async (shop) => {
    const shopProducts = await getProductsByShop(shop.id);
    return shopProducts.map(p => ({
      ...p,
      shopName: shop.name,
      shopImageUrl: shop.imageUrl
    }));
  });
  
  const results = await Promise.all(productsPromises);
  return results.flat().sort((a, b) => {
    const aTime = (a.createdAt as any)?.toMillis?.() || 0;
    const bTime = (b.createdAt as any)?.toMillis?.() || 0;
    return bTime - aTime;
  });
}

