"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginUser, registerUser } from "@/lib/auth";
import { getBanners, Banner, getLocations, Location } from "@/lib/db";
import { Eye, EyeOff, Mail, Lock, MapPin, Sparkles } from "lucide-react";
import { SRI_LANKA_CITIES } from "@/lib/config";
import "./auth.css";

type AuthTab = "login" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [panelImage, setPanelImage] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Login State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup State
  const [email, setEmail] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [allLocations, setAllLocations] = useState<Location[]>([]);

  useEffect(() => {
    getBanners(true).then(data => {
      const panel = data.find(b => b.placement === "auth_panel_image");
      if (panel) setPanelImage(panel.imageUrl);
    }).catch(() => {});

    getLocations().then(data => {
      setAllLocations(data);
    }).catch(() => {});
  }, []);

  const redirectByRole = (role: string, userCity: string) => {
    localStorage.setItem("vito_user_city", userCity);
    if (role === "admin") router.push("/admin");
    else if (role === "seller") router.push("/seller");
    else if (role === "delivery") router.push("/rider");
    else router.push("/home");
  };

  const getFriendlyError = (code: string) => {
    const map: Record<string, string> = {
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/invalid-credential": "Invalid email or password.",
      "auth/email-already-in-use": "Email already registered.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/invalid-email": "Enter a valid email address.",
      "auth/too-many-requests": "Too many attempts. Try again later.",
    };
    return map[code] || "Something went wrong. Please try again.";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) { setAuthError("Please fill in all fields"); return; }
    setIsLoading(true); setAuthError("");
    try {
      const user = await loginUser(loginEmail, loginPassword);
      redirectByRole(user.role, user.city);
    } catch (err: any) {
      setAuthError(getFriendlyError(err.code || ""));
    } finally { setIsLoading(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !city || !password || !confirmPassword) { setAuthError("Please fill in all fields"); return; }
    if (password !== confirmPassword) { setAuthError("Passwords do not match"); return; }
    setIsLoading(true); setAuthError("");
    try {
      const user = await registerUser({ name: "Customer", email, password, phone1: "", address: "", city, role: "customer" });
      redirectByRole(user.role, user.city);
    } catch (err: any) {
      setAuthError(getFriendlyError(err.code || ""));
    } finally { setIsLoading(false); }
  };

  const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-600 focus:bg-white transition-colors";

  /* ─── FORM PANEL (shared by both views) ─── */
  const FormPanel = (
    <div className="auth-form-side">
      {/* Logo */}
      <div className="auth-logo-row">
        <img src="/login.png" alt="Vito" className="auth-logo-img" />
      </div>

      <h2 className="auth-welcome">
        {activeTab === "login" ? (
          <><Sparkles size={22} className="auth-welcome-icon" /> Welcome</>
        ) : (
          <><Sparkles size={22} className="auth-welcome-icon" /> Create account</>
        )}
      </h2>
      <p className="auth-sub">
        {activeTab === "login"
          ? "Sign in to continue to Vito Delivery"
          : "Join Vito Delivery and start ordering"}
      </p>

      {/* Tab switcher */}
      <div className="auth-tabs">
        {(["login", "signup"] as AuthTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setAuthError(""); }}
            className={`auth-tab-btn ${activeTab === tab ? "active" : ""}`}
          >
            {tab === "login" ? "Log In" : "Sign Up"}
          </button>
        ))}
      </div>

      {/* Error */}
      {authError && (
        <div className="auth-error">{authError}</div>
      )}

      {/* LOGIN FORM */}
      {activeTab === "login" && (
        <form onSubmit={handleLogin} className="auth-form">
          <div className="auth-input-wrap">
            <Mail size={16} className="auth-input-icon" />
            <input type="email" className={`${inputCls} pl-10`} placeholder="Email Address"
              value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
          </div>

          <div className="auth-input-wrap">
            <Lock size={16} className="auth-input-icon" />
            <input type={showPass ? "text" : "password"} className={`${inputCls} pl-10 pr-10`} placeholder="Password"
              value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPass(!showPass)} className="auth-eye-btn">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button type="submit" disabled={isLoading} className="auth-submit-btn">
            {isLoading ? "Signing in..." : "Log In"}
          </button>

          {/* Divider */}
          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">or continue with</span>
            <span className="auth-divider-line" />
          </div>

          {/* Social Buttons */}
          <div className="auth-social-row">
            <button type="button" className="auth-social-btn" title="Continue with Google">
              {/* Google SVG */}
              <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                <path d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h13.2c-.6 3-2.3 5.5-4.8 7.2v6h7.8c4.5-4.2 7.3-10.4 7.3-17.5z" fill="#4285F4"/>
                <path d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.8-6c-2.1 1.4-4.9 2.3-8.1 2.3-6.2 0-11.5-4.2-13.4-9.9H2.5v6.2C6.5 42.6 14.7 48 24 48z" fill="#34A853"/>
                <path d="M10.6 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6v-6.2H2.5C.9 16.4 0 20.1 0 24s.9 7.6 2.5 10.8l8.1-6.2z" fill="#FBBC05"/>
                <path d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.9 2.1 30.5 0 24 0 14.7 0 6.5 5.4 2.5 13.2l8.1 6.2C12.5 13.7 17.8 9.5 24 9.5z" fill="#EA4335"/>
              </svg>
              <span>Google</span>
            </button>

            <button type="button" className="auth-social-btn" title="Continue with Facebook">
              {/* Facebook SVG */}
              <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="24" fill="#1877F2"/>
                <path d="M33 24h-6v18h-6V24h-4v-6h4v-3.5C21 10.8 23.2 9 27 9c1.7 0 3.5.2 5 .4V15h-3c-1.4 0-2 .6-2 2v1h5l-1 6z" fill="#fff"/>
              </svg>
              <span>Facebook</span>
            </button>
          </div>

          <p className="auth-switch-text">
            Don&apos;t have an account?{" "}
            <span onClick={() => { setActiveTab("signup"); setAuthError(""); }} className="auth-switch-link">
              Sign Up
            </span>
          </p>
        </form>
      )}

      {/* SIGNUP FORM */}
      {activeTab === "signup" && (
        <form onSubmit={handleSignup} className="auth-form">
          <div className="auth-input-wrap">
            <Mail size={16} className="auth-input-icon" />
            <input type="email" className={`${inputCls} pl-10`} placeholder="Email Address"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="auth-input-wrap">
            <MapPin size={16} className="auth-input-icon" />
            <select className={`${inputCls} pl-10 appearance-none`} value={district} onChange={e => { setDistrict(e.target.value); setCity(""); }}>
              <option value="" disabled>Select Your District</option>
              {Array.from(new Set(allLocations.map(l => l.district))).sort().map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="auth-input-wrap">
            <MapPin size={16} className="auth-input-icon" />
            <select className={`${inputCls} pl-10 appearance-none`} value={city} onChange={e => setCity(e.target.value)} disabled={!district}>
              <option value="" disabled>{district ? "Select Your City" : "Select District First"}</option>
              {allLocations.filter(l => l.district === district).map(l => (
                <option key={l.id} value={l.city}>{l.city}</option>
              ))}
            </select>
          </div>

          <div className="auth-input-wrap">
            <Lock size={16} className="auth-input-icon" />
            <input type={showPass ? "text" : "password"} className={`${inputCls} pl-10 pr-10`} placeholder="Password"
              value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowPass(!showPass)} className="auth-eye-btn">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="auth-input-wrap">
            <Lock size={16} className="auth-input-icon" />
            <input type={showConfirmPass ? "text" : "password"} className={`${inputCls} pl-10 pr-10`} placeholder="Confirm Password"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="auth-eye-btn">
              {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button type="submit" disabled={isLoading} className="auth-submit-btn">
            {isLoading ? "Creating account..." : "Create Account"}
          </button>

          {/* Divider */}
          <div className="auth-divider">
            <span className="auth-divider-line" />
            <span className="auth-divider-text">or continue with</span>
            <span className="auth-divider-line" />
          </div>

          {/* Social Buttons */}
          <div className="auth-social-row">
            <button type="button" className="auth-social-btn" title="Continue with Google">
              <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                <path d="M47.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h13.2c-.6 3-2.3 5.5-4.8 7.2v6h7.8c4.5-4.2 7.3-10.4 7.3-17.5z" fill="#4285F4"/>
                <path d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.8-6c-2.1 1.4-4.9 2.3-8.1 2.3-6.2 0-11.5-4.2-13.4-9.9H2.5v6.2C6.5 42.6 14.7 48 24 48z" fill="#34A853"/>
                <path d="M10.6 28.6c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6v-6.2H2.5C.9 16.4 0 20.1 0 24s.9 7.6 2.5 10.8l8.1-6.2z" fill="#FBBC05"/>
                <path d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.9 2.1 30.5 0 24 0 14.7 0 6.5 5.4 2.5 13.2l8.1 6.2C12.5 13.7 17.8 9.5 24 9.5z" fill="#EA4335"/>
              </svg>
              <span>Google</span>
            </button>
            <button type="button" className="auth-social-btn" title="Continue with Facebook">
              <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="24" fill="#1877F2"/>
                <path d="M33 24h-6v18h-6V24h-4v-6h4v-3.5C21 10.8 23.2 9 27 9c1.7 0 3.5.2 5 .4V15h-3c-1.4 0-2 .6-2 2v1h5l-1 6z" fill="#fff"/>
              </svg>
              <span>Facebook</span>
            </button>
          </div>

          <p className="auth-switch-text">
            Already have an account?{" "}
            <span onClick={() => { setActiveTab("login"); setAuthError(""); }} className="auth-switch-link">
              Log In
            </span>
          </p>
        </form>
      )}
    </div>
  );

  return (
    <>
      {/* ── DESKTOP SPLIT LAYOUT (md+) ── */}
      <div className="auth-desktop">
        {/* Left decorative panel */}
        <div className="auth-panel-left">
          {panelImage ? (
            <>
              <img src={panelImage} alt="Auth Panel" className="auth-panel-bg-img" />
              {/* Overlay only visible on desktop via CSS */}
              <div className="auth-panel-overlay desktop-only-overlay" />
            </>
          ) : (
            <div className="auth-panel-default">
              <div className="auth-panel-default-inner">
                <img src="/logo.png" alt="Vito" className="auth-panel-logo" />
                <h2 className="auth-panel-title">Adventure<br />starts here</h2>
                <p className="auth-panel-desc">Fast delivery from your favourite local shops, right to your door.</p>
              </div>
              {/* decorative circles */}
              <div className="auth-circle auth-circle-1" />
              <div className="auth-circle auth-circle-2" />
              <div className="auth-circle auth-circle-3" />
            </div>
          )}
        </div>

        {/* Right form panel */}
        <div className="auth-panel-right">
          {FormPanel}
        </div>
      </div>

      {/* ── MOBILE LAYOUT ── */}
      <div className="auth-mobile">
        <div className="min-h-dvh bg-white flex flex-col relative">
          <div className="auth-mobile-hero">
            {panelImage ? (
              <img src={panelImage} alt="Vito Delivery" className="auth-mobile-hero-img" />
            ) : (
              <div className="auth-panel-default" style={{ height: '100%', borderRadius: 0 }}>
                <div className="auth-panel-default-inner" style={{ paddingTop: '20%' }}>
                  <img src="/logo.png" alt="Vito" className="auth-panel-logo" style={{ width: '100px', margin: '0 auto 10px' }} />
                  <h2 className="auth-panel-title" style={{ fontSize: '24px', textAlign: 'center' }}>Vito Delivery</h2>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Form Section - Rounded Card */}
          <div className="auth-mobile-content">
             {FormPanel}
          </div>
        </div>
      </div>
    </>
  );
}
