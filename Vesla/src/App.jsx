import { lazy, Suspense, useEffect } from 'react'
import './App.css'
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Layout from './Layout/Layout.jsx';
import { CartProvider } from "./context/CartContext.jsx";

const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const Pricing = lazy(() => import("./pages/pricing.jsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const About = lazy(() => import("./pages/About.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));
const DevicesPage = lazy(() => import("./pages/DevicesPage.jsx"));
const ShopPage = lazy(() => import("./pages/ShopPage.jsx"));
const CartPage = lazy(() => import("./pages/CartPage.jsx"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage.jsx"));

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  return null;
}

function App() {

  return (
    <CartProvider>
      <ScrollToTop />
      <div className="min-h-screen bg-black text-white">
      <Suspense fallback={<div className="min-h-screen bg-black text-white p-8">Loading page…</div>}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<LoginPage initialMode="register" />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/devices" element={<DevicesPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/admin-login" element={<Navigate to="/login" replace />} />
            <Route path="/" element={<HomePage />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/about" element={<About />} />
          </Route>
        </Routes>
      </Suspense>
    </div>
    </CartProvider>
  )
}

export default App
