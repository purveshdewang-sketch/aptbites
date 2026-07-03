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
import Kitchens from "./pages/Kitchens";
import CustomerLogin from "./pages/CustomerLogin";
import SellerLogin from "./pages/SellerLogin";
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
import Favorites from "./pages/Favorites";

import ScrollToTop from "./components/ScrollToTop";
import GlobalBackHandler from "./components/GlobalBackHandler";
import PullToRefresh from "./components/PullToRefresh";

import { useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabaseClient";

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFF8EC] px-4 text-[#181411]">
      <div className="rounded-[28px] border border-[#EADFCE] bg-white/90 px-8 py-7 text-center shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]">
        <div className="mx-auto flex h-14 w-14 animate-spin items-center justify-center rounded-full border-4 border-[#EADFCE] border-t-[#3F5128]" />

        <p className="mt-4 font-black text-[#3F5128]">
          Loading...
        </p>
      </div>
    </main>
  );
}

function shouldShowCustomerBottomNav(pathname) {
  const hiddenRoutes = [
    "/customer-login",
    "/seller-login",
    "/reset-password",
    "/seller-dashboard",
    "/seller-helper",
    "/seller-registration",
    "/owner-dashboard",
    "/owner-accounting",
    "/owner-seller-applications",
    "/care-agent",
    "/order-chat",
    "/food",
    "/cart",
    "/checkout",
    "/privacy-policy",
    "/terms",
    "/refund-policy",
  ];

  return !hiddenRoutes.some((route) =>
    pathname.startsWith(route)
  );
}

function shouldEnablePullToRefresh(pathname) {
  const disabledRoutes = [
    "/customer-login",
    "/seller-login",
    "/reset-password",
  ];

  return !disabledRoutes.some((route) =>
    pathname.startsWith(route)
  );
}

function BottomNav() {
  const navItems = [
    {
      label: "Home",
      path: "/",
      icon: <HomeIcon />,
    },
    {
      label: "Orders",
      path: "/orders",
      icon: <OrdersIcon />,
    },
    {
      label: "Favorites",
      path: "/favorites",
      icon: <FavoriteIcon />,
    },
    {
      label: "Profile",
      path: "/profile",
      icon: <ProfileIcon />,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[900] border-t border-[#EADFCE] bg-[#FFF8EC]/95 shadow-[0_-8px_24px_rgba(63,81,40,0.08)] backdrop-blur-xl">
      <div className="mx-auto grid h-[76px] max-w-md grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-black transition-all ${
                isActive
                  ? "text-[#3F5128]"
                  : "text-[#6B6258] hover:text-[#3F5128]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-2xl border transition-all ${
                    isActive
                      ? "border-[#D8C9B3] bg-[#FFF0DF] shadow-[4px_4px_10px_rgba(63,81,40,0.08),-4px_-4px_10px_rgba(255,255,255,0.9)]"
                      : "border-transparent bg-transparent"
                  }`}
                >
                  <span
                    className={
                      item.label === "Favorites" &&
                      isActive
                        ? "text-[#CF743D]"
                        : ""
                    }
                  >
                    {item.icon}
                  </span>
                </div>

                <span className="leading-none">
                  {item.label}
                </span>
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
    "/customer-login",
    "/seller-login",
    "/reset-password",
    "/seller-dashboard",
    "/seller-helper",
    "/seller-registration",
    "/owner-dashboard",
    "/owner-accounting",
    "/owner-seller-applications",
    "/care-agent",
    "/customer-care",
    "/order-chat",
    "/food",
    "/cart",
    "/checkout",
    "/privacy-policy",
    "/terms",
    "/refund-policy",
  ];

  const shouldHide = hiddenRoutes.some((route) =>
    location.pathname.startsWith(route)
  );

  if (shouldHide) return null;

  const bottomNavVisible =
    shouldShowCustomerBottomNav(
      location.pathname
    );

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
      to={
        isSellerPage
          ? "/seller-helper"
          : "/care-agent"
      }
      className={`fixed right-4 z-[999] rounded-full border px-4 py-3 font-black shadow-2xl transition-all active:scale-95 ${
        bottomNavVisible
          ? "bottom-24"
          : "bottom-5"
      } ${
        isSellerPage
          ? "border-[#CF743D] bg-[#CF743D] text-white hover:bg-[#B85F2C]"
          : "border-[#3F5128] bg-[#3F5128] text-white hover:bg-[#4D612F]"
      }`}
    >
      {isSellerPage
        ? "👨‍🍳 Seller Help"
        : "💬 Help"}
    </Link>
  );
}

function ProtectedRoute({ children }) {
  const { user, authLoading } = useAuth();

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <Navigate
        to="/customer-login"
        replace
      />
    );
  }

  return children;
}

function SellerOnlyRoute({ children }) {
  const { user, authLoading } = useAuth();

  const [checkingRole, setCheckingRole] =
    useState(true);

  const [sellerAllowed, setSellerAllowed] =
    useState(false);

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

      const metadataRole = String(
        user?.user_metadata?.role || ""
      ).toLowerCase();

      if (metadataRole === "admin") {
        if (!cancelled) {
          setSellerAllowed(true);
          setCheckingRole(false);
        }

        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "role, is_seller, seller_application_status"
        )
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setSellerAllowed(false);
        setCheckingRole(false);
        return;
      }

      const profileRole = String(
        data?.role || ""
      ).toLowerCase();

      const applicationStatus = String(
        data?.seller_application_status ||
          "not_applied"
      ).toLowerCase();

      const isApprovedSeller =
        profileRole === "seller" &&
        data?.is_seller === true &&
        applicationStatus === "approved";

      const isAdmin =
        profileRole === "admin";

      setSellerAllowed(
        isApprovedSeller || isAdmin
      );

      setCheckingRole(false);
    }

    checkSellerAccess();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (authLoading || checkingRole) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <Navigate
        to="/customer-login"
        replace
      />
    );
  }

  if (!sellerAllowed) {
    return (
      <Navigate
        to="/seller-registration"
        replace
      />
    );
  }

  return children;
}

function AdminOnlyRoute({ children }) {
  const { user, authLoading } = useAuth();

  const [checkingRole, setCheckingRole] =
    useState(true);

  const [adminAllowed, setAdminAllowed] =
    useState(false);

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

      const metadataRole = String(
        user?.user_metadata?.role || ""
      ).toLowerCase();

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

      const profileRole = String(
        data?.role || ""
      ).toLowerCase();

      setAdminAllowed(
        profileRole === "admin"
      );

      setCheckingRole(false);
    }

    checkAdminAccess();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  if (authLoading || checkingRole) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <Navigate
        to="/customer-login"
        replace
      />
    );
  }

  if (!adminAllowed) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function ComingSoonPage({
  title,
  description,
}) {
  return (
    <main className="min-h-screen bg-[#FFF8EC] px-4 py-6 pb-28 text-[#181411]">
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-black text-[#181411]">
          {title}
        </h1>

        <div className="mt-5 rounded-[28px] border border-[#EADFCE] bg-white/90 p-6 shadow-[8px_8px_22px_rgba(63,81,40,0.07),-8px_-8px_22px_rgba(255,255,255,0.95)]">
          <p className="text-sm font-semibold leading-relaxed text-[#6B6258]">
            {description}
          </p>

          <Link
            to="/profile"
            className="mt-6 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 text-center text-sm font-black text-white active:scale-[0.98]"
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
      <Route
        path="/customer-login"
        element={<CustomerLogin />}
      />

      <Route
        path="/seller-login"
        element={<SellerLogin />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

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
        path="/kitchens"
        element={
          <ProtectedRoute>
            <Kitchens />
          </ProtectedRoute>
        }
      />

      <Route
        path="/marketplace"
        element={
          <Navigate
            to="/?search=1"
            replace
          />
        }
      />

      <Route
        path="/search"
        element={
          <Navigate
            to="/?search=1"
            replace
          />
        }
      />

      <Route
        path="/favorites"
        element={
          <ProtectedRoute>
            <Favorites />
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

      <Route
        path="*"
        element={
          <Navigate to="/" replace />
        }
      />
    </Routes>
  );
}

function AppShell() {
  const location = useLocation();

  const showBottomNav =
    shouldShowCustomerBottomNav(
      location.pathname
    );

  const pullToRefreshEnabled =
    shouldEnablePullToRefresh(
      location.pathname
    );

  return (
    <>
      <GlobalBackHandler />

      <ScrollToTop />

      <PullToRefresh
        enabled={pullToRefreshEnabled}
      />

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

function FavoriteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
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