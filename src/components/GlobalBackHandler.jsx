import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  useNavigationType,
} from "react-router-dom";

import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

import { useAuth } from "../context/AuthContext";

const HISTORY_STORAGE_KEY =
  "NeFo_internal_route_history";

const MAX_HISTORY_LENGTH = 40;

const EXIT_CONFIRMATION_TIME = 2000;

function getRouteValue(location) {
  return `${location.pathname}${location.search}${location.hash}`;
}

function getRoutePathname(route) {
  return (
    String(route || "")
      .split("?")[0]
      .split("#")[0] || "/"
  );
}

function readRouteHistory() {
  try {
    const savedHistory = JSON.parse(
      sessionStorage.getItem(
        HISTORY_STORAGE_KEY
      ) || "[]"
    );

    return Array.isArray(savedHistory)
      ? savedHistory.filter(
          (route) =>
            typeof route === "string" &&
            route
        )
      : [];
  } catch {
    return [];
  }
}

function saveRouteHistory(history) {
  const cleanHistory = history
    .filter(
      (route) =>
        typeof route === "string" &&
        route
    )
    .slice(-MAX_HISTORY_LENGTH);

  sessionStorage.setItem(
    HISTORY_STORAGE_KEY,
    JSON.stringify(cleanHistory)
  );

  return cleanHistory;
}

function isAuthenticationRoute(route) {
  const pathname =
    getRoutePathname(route);

  return [
    "/customer-login",
    "/seller-login",
    "/reset-password",
  ].some((authRoute) =>
    pathname.startsWith(authRoute)
  );
}

function isNativeAndroid() {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() ===
      "android"
  );
}

function isBaseExitRoute(
  location,
  user
) {
  const isBaseHome =
    location.pathname === "/" &&
    !location.search &&
    !location.hash;

  const isLoggedOutEntry =
    !user &&
    location.pathname ===
      "/customer-login";

  return (
    isBaseHome ||
    isLoggedOutEntry
  );
}

function getForcedBackRoute(pathname) {
  /*
   * Seller Dashboard is a separate
   * working area. Going back from it
   * should always return to customer
   * Home rather than reopening login,
   * profile, or another seller page.
   */
  if (
    pathname.startsWith(
      "/seller-dashboard"
    )
  ) {
    return "/";
  }

  if (
    pathname.startsWith(
      "/seller-helper"
    )
  ) {
    return "/seller-dashboard";
  }

  return "";
}

function getFallbackRoute(pathname) {
  if (
    pathname.startsWith("/food/")
  ) {
    return "/?search=1";
  }

  if (
    pathname.startsWith("/kitchens")
  ) {
    return "/";
  }

  if (
    pathname.startsWith("/checkout")
  ) {
    return "/cart";
  }

  if (
    pathname.startsWith("/cart")
  ) {
    return "/?search=1";
  }

  if (
    pathname.startsWith(
      "/order-chat/"
    )
  ) {
    return "/orders";
  }

  if (
    pathname.startsWith(
      "/order-history"
    )
  ) {
    return "/orders";
  }

  if (
    pathname.startsWith("/orders")
  ) {
    return "/";
  }

  if (
    pathname.startsWith(
      "/care-agent"
    )
  ) {
    return "/customer-care";
  }

  if (
    pathname.startsWith(
      "/customer-care"
    )
  ) {
    return "/profile";
  }

  if (
    pathname.startsWith(
      "/seller-helper"
    )
  ) {
    return "/seller-dashboard";
  }

  if (
    pathname.startsWith(
      "/seller-registration"
    )
  ) {
    return "/profile";
  }

  if (
    pathname.startsWith(
      "/seller-dashboard"
    )
  ) {
    return "/";
  }

  if (
    pathname.startsWith(
      "/owner-accounting"
    ) ||
    pathname.startsWith(
      "/owner-seller-applications"
    )
  ) {
    return "/owner-dashboard";
  }

  if (
    pathname.startsWith(
      "/owner-dashboard"
    )
  ) {
    return "/";
  }

  if (
    pathname.startsWith(
      "/privacy-policy"
    ) ||
    pathname.startsWith("/terms") ||
    pathname.startsWith(
      "/refund-policy"
    )
  ) {
    return "/profile";
  }

  if (
    pathname.startsWith(
      "/saved-kitchens"
    ) ||
    pathname.startsWith(
      "/payment-methods"
    )
  ) {
    return "/profile";
  }

  if (
    pathname.startsWith(
      "/favorites"
    ) ||
    pathname.startsWith(
      "/marketplace"
    ) ||
    pathname.startsWith(
      "/profile"
    )
  ) {
    return "/";
  }

  if (
    pathname.startsWith(
      "/reset-password"
    ) ||
    pathname.startsWith(
      "/seller-login"
    )
  ) {
    return "/customer-login";
  }

  return "/";
}

function findPreviousRoute({
  history,
  currentRoute,
  user,
}) {
  let currentIndex =
    history.lastIndexOf(
      currentRoute
    );

  if (currentIndex < 0) {
    currentIndex = history.length;
  }

  for (
    let index = currentIndex - 1;
    index >= 0;
    index -= 1
  ) {
    const candidateRoute =
      history[index];

    if (
      !candidateRoute ||
      candidateRoute === currentRoute
    ) {
      continue;
    }

    if (
      user &&
      isAuthenticationRoute(
        candidateRoute
      )
    ) {
      continue;
    }

    return candidateRoute;
  }

  return "";
}

export default function GlobalBackHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  const navigationType =
    useNavigationType();

  const { user } = useAuth();

  const [showExitPrompt, setShowExitPrompt] =
    useState(false);

  const initializedRef =
    useRef(false);

  const backInProgressRef =
    useRef(false);

  const lastExitPressRef =
    useRef(0);

  const exitPromptTimerRef =
    useRef(null);

  const nativeBackHandlerRef =
    useRef(null);

  const currentRoute =
    getRouteValue(location);

  const clearExitPrompt =
    useCallback(() => {
      lastExitPressRef.current = 0;

      setShowExitPrompt(false);

      if (
        exitPromptTimerRef.current
      ) {
        window.clearTimeout(
          exitPromptTimerRef.current
        );

        exitPromptTimerRef.current =
          null;
      }
    }, []);

  const showExitMessage =
    useCallback(() => {
      lastExitPressRef.current =
        Date.now();

      setShowExitPrompt(true);

      if (
        exitPromptTimerRef.current
      ) {
        window.clearTimeout(
          exitPromptTimerRef.current
        );
      }

      exitPromptTimerRef.current =
        window.setTimeout(() => {
          lastExitPressRef.current = 0;
          setShowExitPrompt(false);

          exitPromptTimerRef.current =
            null;
        }, EXIT_CONFIRMATION_TIME);
    }, []);

  useEffect(() => {
    const storedHistory =
      readRouteHistory();

    if (!initializedRef.current) {
      initializedRef.current = true;

      if (
        storedHistory.length === 0
      ) {
        saveRouteHistory([
          currentRoute,
        ]);

        return;
      }
    }

    const history =
      readRouteHistory();

    const lastRoute =
      history[
        history.length - 1
      ];

    if (
      navigationType === "REPLACE"
    ) {
      if (history.length === 0) {
        saveRouteHistory([
          currentRoute,
        ]);
      } else if (
        lastRoute !== currentRoute
      ) {
        saveRouteHistory([
          ...history.slice(0, -1),
          currentRoute,
        ]);
      }

      return;
    }

    if (navigationType === "POP") {
      const currentRouteIndex =
        history.lastIndexOf(
          currentRoute
        );

      if (
        currentRouteIndex >= 0
      ) {
        saveRouteHistory(
          history.slice(
            0,
            currentRouteIndex + 1
          )
        );
      } else if (
        lastRoute !== currentRoute
      ) {
        saveRouteHistory([
          ...history,
          currentRoute,
        ]);
      }

      return;
    }

    if (
      lastRoute !== currentRoute
    ) {
      saveRouteHistory([
        ...history,
        currentRoute,
      ]);
    }
  }, [
    currentRoute,
    navigationType,
  ]);

  useEffect(() => {
    clearExitPrompt();
  }, [
    currentRoute,
    clearExitPrompt,
  ]);

  const goBack = useCallback(() => {
    if (
      backInProgressRef.current
    ) {
      return;
    }

    backInProgressRef.current = true;

    const history =
      readRouteHistory();

    const currentPath =
      getRouteValue(location);

    const forcedBackRoute =
      getForcedBackRoute(
        location.pathname
      );

    if (
      forcedBackRoute &&
      forcedBackRoute !== currentPath
    ) {
      saveRouteHistory([
        forcedBackRoute,
      ]);

      navigate(forcedBackRoute, {
        replace: true,
      });

      window.setTimeout(() => {
        backInProgressRef.current =
          false;
      }, 250);

      return;
    }

    const previousRoute =
      findPreviousRoute({
        history,
        currentRoute: currentPath,
        user,
      });

    if (previousRoute) {
      const previousIndex =
        history.lastIndexOf(
          previousRoute
        );

      saveRouteHistory(
        history.slice(
          0,
          previousIndex + 1
        )
      );

      navigate(previousRoute, {
        replace: true,
      });
    } else {
      const fallbackRoute =
        getFallbackRoute(
          location.pathname
        );

      saveRouteHistory([
        fallbackRoute,
      ]);

      navigate(fallbackRoute, {
        replace: true,
      });
    }

    window.setTimeout(() => {
      backInProgressRef.current =
        false;
    }, 250);
  }, [
    location,
    navigate,
    user,
  ]);

  const handleNativeBack =
    useCallback(() => {
      if (
        isBaseExitRoute(
          location,
          user
        )
      ) {
        const now = Date.now();

        const pressedRecently =
          now -
            lastExitPressRef.current <=
          EXIT_CONFIRMATION_TIME;

        if (
          pressedRecently &&
          lastExitPressRef.current > 0
        ) {
          clearExitPrompt();

          void CapacitorApp.exitApp();

          return;
        }

        showExitMessage();
        return;
      }

      clearExitPrompt();
      goBack();
    }, [
      location,
      user,
      clearExitPrompt,
      showExitMessage,
      goBack,
    ]);

  useEffect(() => {
    nativeBackHandlerRef.current =
      handleNativeBack;
  }, [handleNativeBack]);

  useEffect(() => {
    if (!isNativeAndroid()) {
      return undefined;
    }

    let listenerHandle = null;
    let effectCancelled = false;

    async function registerBackListener() {
      try {
        const handle =
          await CapacitorApp.addListener(
            "backButton",
            () => {
              nativeBackHandlerRef.current?.();
            }
          );

        if (effectCancelled) {
          await handle.remove();
          return;
        }

        listenerHandle = handle;
      } catch (error) {
        console.error(
          "NeFo native back-button listener could not be registered:",
          error
        );
      }
    }

    registerBackListener();

    return () => {
      effectCancelled = true;

      if (listenerHandle) {
        void listenerHandle.remove();
      }
    };
  }, []);

  useEffect(() => {
    function handleGlobalBackClick(
      event
    ) {
      if (
        !(
          event.target instanceof
          Element
        )
      ) {
        return;
      }

      const backControl =
        event.target.closest(
          [
            'button[aria-label="Go back"]',
            'a[aria-label="Go back"]',
            'button[aria-label="Back"]',
            'a[aria-label="Back"]',
            '[data-NeFo-back="true"]',
          ].join(", ")
        );

      if (!backControl) return;

      if (
        backControl instanceof
          HTMLButtonElement &&
        backControl.disabled
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (
        typeof event.stopImmediatePropagation ===
        "function"
      ) {
        event.stopImmediatePropagation();
      }

      clearExitPrompt();
      goBack();
    }

    document.addEventListener(
      "click",
      handleGlobalBackClick,
      true
    );

    return () => {
      document.removeEventListener(
        "click",
        handleGlobalBackClick,
        true
      );
    };
  }, [
    goBack,
    clearExitPrompt,
  ]);

  useEffect(() => {
    window.NeFoGoBack = goBack;

    return () => {
      delete window.NeFoGoBack;
    };
  }, [goBack]);

  useEffect(() => {
    return () => {
      if (
        exitPromptTimerRef.current
      ) {
        window.clearTimeout(
          exitPromptTimerRef.current
        );
      }
    };
  }, []);

  if (!showExitPrompt) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed bottom-24 left-1/2 z-[1200] -translate-x-1/2 whitespace-nowrap rounded-full border border-[#D8C9B3] bg-[#181411]/95 px-5 py-3 text-sm font-black text-white shadow-2xl"
      role="status"
      aria-live="polite"
    >
      Press back again to exit
    </div>
  );
}