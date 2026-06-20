import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from "react-router-dom";

import Home from "./pages/Home";
import CustomerLogin from "./pages/CustomerLogin";
import SellerLogin from "./pages/SellerLogin";
import Marketplace from "./pages/Marketplace";
import SellerDashboard from "./pages/SellerDashboard";
import SellerRegistration from "./pages/SellerRegistration";
import OwnerSellerApplications from "./pages/OwnerSellerApplications";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import OrderHistory from "./pages/OrderHistory";
import FoodDetails from "./pages/FoodDetails";
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerAccounting from "./pages/OwnerAccounting";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import CustomerCare from "./pages/CustomerCare";
import CustomerCareAgent from "./pages/CustomerCareAgent";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import RefundPolicy from "./pages/RefundPolicy";
import SellerHelper from "./pages/SellerHelper";
import OrderChat from "./pages/OrderChat";
import ScrollToTop from "./components/ScrollToTop";

import { useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabaseClient";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#FFFFF2] flex items-center justify-center text-[#073B35] font-black">
      Loading...
    </div>
  );
}

function FloatingHelpButton() {
  const location = useLocation();

  const hiddenRoutes = [
    "/customer-login",
    "/seller-login",
    "/reset-password",
    "/care-agent",
    "/seller-helper",
    "/order-chat",
  ];

  const shouldHide = hiddenRoutes.some((route) =>
    location.pathname.startsWith(route)
  );

  if (shouldHide) return null;

  const needsHigherPosition =
    location.pathname === "/cart" ||
    location.pathname === "/checkout" ||
    location.pathname.startsWith("/food/");

  const sellerPages = [
    "/seller-dashboard",
    "/seller-helper",
    "/owner-dashboard",
    "/owner-accounting",
    "/owner-seller-applications",
  ];

  const isSellerPage = sellerPages.some((page) =>
    location.pathname.startsWith(page)
  );

  return (
    <Link
      to={isSellerPage ? "/seller-helper" : "/care-agent"}
      className={`fixed right-4 z-[999] font-black px-4 py-3 rounded-full shadow-2xl active:scale-95 transition-all ${
        needsHigherPosition ? "bottom-24" : "bottom-5"
      } ${
        isSellerPage
          ? "bg-[#FFB703] hover:bg-[#FFC533] text-[#111827]"
          : "bg-[#073B35] hover:bg-[#0B5149] text-white border border-[#41D3BD]/30"
      }`}
    >
      {isSellerPage ? "👨‍🍳 Seller Help" : "💬 Help"}
    </Link>
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
  const [sellerAllowed, setSellerAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSellerAccess() {
      if (authLoading) return;

      if (!user) {
        if (!cancelled) {
          setSellerAllowed(false);
          setCheckingRole(false);
        }
        return;
      }

      setCheckingRole(true);

      const metadataRole = String(user?.user_metadata?.role || "").toLowerCase();

      if (metadataRole === "admin") {
        if (!cancelled) {
          setSellerAllowed(true);
          setCheckingRole(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role, is_seller, seller_application_status")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setSellerAllowed(false);
        setCheckingRole(false);
        return;
      }

      const profileRole = String(data?.role || "").toLowerCase();
      const applicationStatus = String(
        data?.seller_application_status || "not_applied"
      ).toLowerCase();

      const isApprovedSeller =
        profileRole === "seller" &&
        data?.is_seller === true &&
        applicationStatus === "approved";

      const isAdmin = profileRole === "admin";

      setSellerAllowed(isApprovedSeller || isAdmin);
      setCheckingRole(false);
    }

    checkSellerAccess();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (authLoading || checkingRole) return <LoadingScreen />;
  if (!user) return <Navigate to="/customer-login" replace />;
  if (!sellerAllowed) return <Navigate to="/seller-registration" replace />;

  return children;
}

function AdminOnlyRoute({ children }) {
  const { user, authLoading } = useAuth();

  const [checkingRole, setCheckingRole] = useState(true);
  const [adminAllowed, setAdminAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAdminAccess() {
      if (authLoading) return;

      if (!user) {
        if (!cancelled) {
          setAdminAllowed(false);
          setCheckingRole(false);
        }
        return;
      }

      setCheckingRole(true);

      const metadataRole = String(user?.user_metadata?.role || "").toLowerCase();

      if (metadataRole === "admin") {
        if (!cancelled) {
          setAdminAllowed(true);
          setCheckingRole(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setAdminAllowed(false);
        setCheckingRole(false);
        return;
      }

      const profileRole = String(data?.role || "").toLowerCase();

      setAdminAllowed(profileRole === "admin");
      setCheckingRole(false);
    }

    checkAdminAccess();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (authLoading || checkingRole) return <LoadingScreen />;
  if (!user) return <Navigate to="/customer-login" replace />;
  if (!adminAllowed) return <Navigate to="/" replace />;

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />

      <Routes>
        <Route path="/customer-login" element={<CustomerLogin />} />
        <Route path="/seller-login" element={<SellerLogin />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/seller-registration"
          element={
            <ProtectedRoute>
              <SellerRegistration />
            </ProtectedRoute>
          }
        />

        <Route
          path="/privacy-policy"
          element={
            <ProtectedRoute>
              <PrivacyPolicy />
            </ProtectedRoute>
          }
        />

        <Route
          path="/terms"
          element={
            <ProtectedRoute>
              <Terms />
            </ProtectedRoute>
          }
        />

        <Route
          path="/refund-policy"
          element={
            <ProtectedRoute>
              <RefundPolicy />
            </ProtectedRoute>
          }
        />

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
          path="/food/:id"
          element={
            <ProtectedRoute>
              <FoodDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer-care"
          element={
            <ProtectedRoute>
              <CustomerCare />
            </ProtectedRoute>
          }
        />

        <Route
          path="/care-agent"
          element={
            <ProtectedRoute>
              <CustomerCareAgent />
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
          path="/seller-helper"
          element={
            <SellerOnlyRoute>
              <SellerHelper />
            </SellerOnlyRoute>
          }
        />

        <Route
          path="/owner-dashboard"
          element={
            <AdminOnlyRoute>
              <OwnerDashboard />
            </AdminOnlyRoute>
          }
        />

        <Route
          path="/owner-accounting"
          element={
            <AdminOnlyRoute>
              <OwnerAccounting />
            </AdminOnlyRoute>
          }
        />

        <Route
          path="/owner-seller-applications"
          element={
            <AdminOnlyRoute>
              <OwnerSellerApplications />
            </AdminOnlyRoute>
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
          path="/order-chat/:orderId"
          element={
            <ProtectedRoute>
              <OrderChat />
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

      <FloatingHelpButton />
    </BrowserRouter>
  );
}