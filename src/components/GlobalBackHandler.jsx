import { useCallback, useEffect, useRef } from "react";
import {
  useLocation,
  useNavigate,
  useNavigationType,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const HISTORY_STORAGE_KEY = "Nefo_internal_route_history";
const MAX_HISTORY_LENGTH = 40;

function getRouteValue(location) {
  return `${location.pathname}${location.search}${location.hash}`;
}

function getRoutePathname(route) {
  return String(route || "").split("?")[0].split("#")[0] || "/";
}

function readRouteHistory() {
  try {
    const savedHistory = JSON.parse(
      sessionStorage.getItem(HISTORY_STORAGE_KEY) || "[]"
    );

    return Array.isArray(savedHistory)
      ? savedHistory.filter((route) => typeof route === "string" && route)
      : [];
  } catch {
    return [];
  }
}

function saveRouteHistory(history) {
  const cleanHistory = history
    .filter((route) => typeof route === "string" && route)
    .slice(-MAX_HISTORY_LENGTH);

  sessionStorage.setItem(
    HISTORY_STORAGE_KEY,
    JSON.stringify(cleanHistory)
  );

  return cleanHistory;
}

function isAuthenticationRoute(route) {
  const pathname = getRoutePathname(route);

  return [
    "/customer-login",
    "/seller-login",
    "/reset-password",
  ].some((authRoute) => pathname.startsWith(authRoute));
}

function getFallbackRoute(pathname) {
  if (pathname.startsWith("/food/")) return "/marketplace";
  if (pathname.startsWith("/checkout")) return "/cart";
  if (pathname.startsWith("/cart")) return "/marketplace";

  if (pathname.startsWith("/order-chat/")) return "/orders";
  if (pathname.startsWith("/order-history")) return "/orders";
  if (pathname.startsWith("/orders")) return "/";

  if (pathname.startsWith("/care-agent")) return "/customer-care";
  if (pathname.startsWith("/customer-care")) return "/profile";

  if (pathname.startsWith("/seller-helper")) {
    return "/seller-dashboard";
  }

  if (pathname.startsWith("/seller-registration")) {
    return "/profile";
  }

  if (pathname.startsWith("/seller-dashboard")) {
    return "/profile";
  }

  if (
    pathname.startsWith("/owner-dashboard") ||
    pathname.startsWith("/owner-accounting") ||
    pathname.startsWith("/owner-seller-applications")
  ) {
    return "/profile";
  }

  if (
    pathname.startsWith("/privacy-policy") ||
    pathname.startsWith("/terms") ||
    pathname.startsWith("/refund-policy")
  ) {
    return "/profile";
  }

  if (
    pathname.startsWith("/favorites") ||
    pathname.startsWith("/marketplace") ||
    pathname.startsWith("/profile")
  ) {
    return "/";
  }

  return "/";
}

export default function GlobalBackHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const { user } = useAuth();

  const initializedRef = useRef(false);
  const backInProgressRef = useRef(false);

  const currentRoute = getRouteValue(location);

  useEffect(() => {
    const storedHistory = readRouteHistory();

    if (!initializedRef.current) {
      initializedRef.current = true;

      if (storedHistory.length === 0) {
        saveRouteHistory([currentRoute]);
        return;
      }
    }

    const history = readRouteHistory();
    const lastRoute = history[history.length - 1];

    if (navigationType === "REPLACE") {
      if (history.length === 0) {
        saveRouteHistory([currentRoute]);
      } else if (lastRoute !== currentRoute) {
        saveRouteHistory([
          ...history.slice(0, -1),
          currentRoute,
        ]);
      }

      return;
    }

    if (navigationType === "POP") {
      const currentRouteIndex = history.lastIndexOf(currentRoute);

      if (currentRouteIndex >= 0) {
        saveRouteHistory(history.slice(0, currentRouteIndex + 1));
      } else if (lastRoute !== currentRoute) {
        saveRouteHistory([...history, currentRoute]);
      }

      return;
    }

    if (lastRoute !== currentRoute) {
      saveRouteHistory([...history, currentRoute]);
    }
  }, [currentRoute, navigationType]);

  const goBack = useCallback(() => {
    if (backInProgressRef.current) return;

    backInProgressRef.current = true;

    const history = readRouteHistory();
    const currentPath = getRouteValue(location);

    let currentIndex = history.lastIndexOf(currentPath);

    if (currentIndex < 0) {
      currentIndex = history.length;
    }

    let previousRoute = "";

    for (let index = currentIndex - 1; index >= 0; index -= 1) {
      const candidateRoute = history[index];

      if (!candidateRoute || candidateRoute === currentPath) {
        continue;
      }

      if (user && isAuthenticationRoute(candidateRoute)) {
        continue;
      }

      previousRoute = candidateRoute;
      break;
    }

    if (previousRoute) {
      const previousIndex = history.lastIndexOf(previousRoute);

      saveRouteHistory(history.slice(0, previousIndex + 1));

      navigate(previousRoute, {
        replace: true,
      });
    } else {
      const fallbackRoute = getFallbackRoute(location.pathname);

      saveRouteHistory([fallbackRoute]);

      navigate(fallbackRoute, {
        replace: true,
      });
    }

    window.setTimeout(() => {
      backInProgressRef.current = false;
    }, 250);
  }, [location, navigate, user]);

  useEffect(() => {
    function handleGlobalBackClick(event) {
      if (!(event.target instanceof Element)) return;

      const backControl = event.target.closest(
        'button[aria-label="Go back"], a[aria-label="Go back"], [data-nefo-back="true"]'
      );

      if (!backControl) return;

      if (
        backControl instanceof HTMLButtonElement &&
        backControl.disabled
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }

      goBack();
    }

    document.addEventListener("click", handleGlobalBackClick, true);

    return () => {
      document.removeEventListener(
        "click",
        handleGlobalBackClick,
        true
      );
    };
  }, [goBack]);

  useEffect(() => {
    window.nefoGoBack = goBack;

    return () => {
      delete window.nefoGoBack;
    };
  }, [goBack]);

  return null;
}