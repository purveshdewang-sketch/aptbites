import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  NavLink,
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

function shouldShowCustomerBottomNav(pathname) {
  const hiddenRoutes = [
    "/customer-login",
    "/seller-login",
    "/reset-password",
    "/seller-dashboard",
    "/seller-helper",
    "/owner-dashboard",
    "/owner-accounting",
    "/owner-seller-applications",
    "/care-agent",
    "/order-chat",
    "/food",
  ];

  return !hiddenRoutes.some((route) => pathname.startsWith(route));
}

function BottomNav() {
  const navItems = [
    {
      label: "Home",
      path: "/",
      icon: <HomeIcon />,
    },
    {
      label: "Search",
      path: "/marketplace",
      icon: <SearchIcon />,
    },
    {
      label: "Orders",
      path: "/orders",
      icon: <OrdersIcon />,
    },
    {
      label: "Profile",
      path: "/profile",
      icon: <ProfileIcon />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[900] border-t border-[#E8F4F1] bg-[#FFFFF2]/95 backdrop-blur-xl">
      <div className="mx-auto grid h-[70px] max-w-md grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black transition-all ${
                isActive
                  ? "text-[#073B35]"
                  : "text-[#7A8783] hover:text-[#073B35]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-2xl transition-all ${
                    isActive
                      ? "bg-[#D7F5EF] shadow-[4px_4px_10px_rgba(7,59,53,0.08),-4px_-4px_10px_rgba(255,255,255,0.9)]"
                      : ""
                  }`}
                >
                  {item.icon}
                </div>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function FloatingHelpButton() {
  const location = useLocation();

  const hiddenRoutes = [
    "/seller-dashboard",
    "/food",
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

  const bottomNavVisible = shouldShowCustomerBottomNav(location.pathname);

  const sellerDashboardPage = location.pathname.startsWith("/seller-dashboard");

const needsHigherPosition =
  bottomNavVisible ||
  sellerDashboardPage ||
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
        sellerDashboardPage ? "bottom-28" : needsHigherPosition ? "bottom-24" : "bottom-5"
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

function ComingSoonPage({ title, description }) {
  return (
    <main className="min-h-screen bg-[#FFFFF2] px-4 py-6 pb-28 text-[#111827]">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-black text-[#111827]">{title}</h1>

        <div className="mt-5 rounded-[28px] border border-[#E8F4F1] bg-white/90 p-6 shadow-[8px_8px_22px_rgba(7,59,53,0.07),-8px_-8px_22px_rgba(255,255,255,0.95)]">
          <p className="text-sm font-semibold leading-relaxed text-[#51615D]">
            {description}
          </p>

          <Link
            to="/profile"
            className="mt-6 block rounded-2xl bg-[#073B35] py-4 text-center text-sm font-black text-white active:scale-[0.98]"
          >
            Back to Profile
          </Link>
        </div>
      </div>
    </main>
  );
}

function AppRoutes() {
  return (
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
        path="/saved-kitchens"
        element={
          <ProtectedRoute>
            <ComingSoonPage
              title="Saved Kitchens"
              description="Saved kitchens will appear here after the favourite kitchen feature is connected."
            />
          </ProtectedRoute>
        }
      />

      <Route
        path="/payment-methods"
        element={
          <ProtectedRoute>
            <ComingSoonPage
              title="Payment Methods"
              description="Payment methods will appear here after the payment wallet or saved payment feature is connected."
            />
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
  );
}

function AppShell() {
  const location = useLocation();
  const showBottomNav = shouldShowCustomerBottomNav(location.pathname);

  return (
    <>
      <ScrollToTop />

      <AppRoutes />

      <FloatingHelpButton />

      {showBottomNav ? <BottomNav /> : null}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

function HomeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M7 3h10l1 4H6l1-4z" />
      <path d="M6 7h12v14H6z" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1.8-4 5-6 8-6s6.2 2 8 6" />
    </svg>
  );
}