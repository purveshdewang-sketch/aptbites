import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import CustomerLogin from "./pages/CustomerLogin";
import SellerLogin from "./pages/SellerLogin";
import Marketplace from "./pages/Marketplace";
import SellerDashboard from "./pages/SellerDashboard";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import OrderHistory from "./pages/OrderHistory";

import { useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabaseClient";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      Loading...
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) return <LoadingScreen />;

  if (!user) return <Navigate to="/customer-login" replace />;

  return children;
}

function SellerOnlyRoute({ children }) {
  const { user, authLoading } = useAuth();

  const [checkingRole, setCheckingRole] = useState(true);
  const [isSeller, setIsSeller] = useState(false);

  useEffect(() => {
    async function checkSellerRole() {
      if (!user) {
        setIsSeller(false);
        setCheckingRole(false);
        return;
      }

      setCheckingRole(true);

      const metadataRole = String(user?.user_metadata?.role || "").toLowerCase();

      const localSellerAccess =
        localStorage.getItem(`quickbites_seller_access_${user.id}`) === "yes";

      if (metadataRole === "seller" || localSellerAccess) {
        setIsSeller(true);
        setCheckingRole(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role, is_seller")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        setIsSeller(false);
      } else {
        const profileRole = String(data?.role || "").toLowerCase();
        const sellerAllowed =
          profileRole === "seller" || data?.is_seller === true;

        setIsSeller(sellerAllowed);

        if (sellerAllowed) {
          localStorage.setItem(`quickbites_seller_access_${user.id}`, "yes");
        }
      }

      setCheckingRole(false);
    }

    checkSellerRole();
  }, [user]);

  if (authLoading || checkingRole) return <LoadingScreen />;

  if (!user) return <Navigate to="/customer-login" replace />;

  if (!isSeller) return <Navigate to="/marketplace" replace />;

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/customer-login" element={<CustomerLogin />} />
        <Route path="/seller-login" element={<SellerLogin />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/marketplace"
          element={
            <ProtectedRoute>
              <Marketplace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/seller-dashboard"
          element={
            <SellerOnlyRoute>
              <SellerDashboard />
            </SellerOnlyRoute>
          }
        />

        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          }
        />

        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          }
        />

        <Route
          path="/order-history"
          element={
            <ProtectedRoute>
              <OrderHistory />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}