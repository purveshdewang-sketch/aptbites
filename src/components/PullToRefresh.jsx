import { useEffect, useRef, useState } from "react";

const TRIGGER_DISTANCE = 82;
const MAX_PULL_DISTANCE = 125;
const REFRESH_DELAY = 450;

function hasScrolledContainer(target) {
  let element =
    target instanceof Element ? target : null;

  while (
    element &&
    element !== document.body &&
    element !== document.documentElement
  ) {
    const styles = window.getComputedStyle(element);

    const canScrollVertically =
      /(auto|scroll)/.test(styles.overflowY) &&
      element.scrollHeight > element.clientHeight;

    if (
      canScrollVertically &&
      element.scrollTop > 0
    ) {
      return true;
    }

    element = element.parentElement;
  }

  return false;
}

function isTextInput(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest(
      "input, textarea, select, [contenteditable='true']"
    )
  );
}

export default function PullToRefresh({
  enabled = true,
}) {
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const animationFrameRef = useRef(null);
  const refreshTimerRef = useRef(null);

  const [pullDistance, setPullDistance] =
    useState(0);

  const [refreshing, setRefreshing] =
    useState(false);

  function updateDistance(nextDistance) {
    const safeDistance = Math.max(
      0,
      Math.min(nextDistance, MAX_PULL_DISTANCE)
    );

    distanceRef.current = safeDistance;
    setPullDistance(safeDistance);
  }

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    if (!enabled) {
      pullingRef.current = false;
      refreshingRef.current = false;
      updateDistance(0);
      setRefreshing(false);
      return undefined;
    }

    const htmlElement =
      document.documentElement;

    const bodyElement = document.body;

    const previousHtmlOverscroll =
      htmlElement.style.overscrollBehaviorY;

    const previousBodyOverscroll =
      bodyElement.style.overscrollBehaviorY;

    /*
      Prevent Chrome/Android's browser-level pull refresh
      so the app can provide one consistent refresh gesture.
    */
    htmlElement.style.overscrollBehaviorY =
      "none";

    bodyElement.style.overscrollBehaviorY =
      "none";

    function handleTouchStart(event) {
      if (
        refreshingRef.current ||
        event.touches.length !== 1 ||
        window.scrollY > 0 ||
        isTextInput(event.target) ||
        hasScrolledContainer(event.target)
      ) {
        pullingRef.current = false;
        return;
      }

      const touch = event.touches[0];

      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      pullingRef.current = true;

      updateDistance(0);
    }

    function handleTouchMove(event) {
      if (
        !pullingRef.current ||
        refreshingRef.current ||
        event.touches.length !== 1
      ) {
        return;
      }

      const touch = event.touches[0];

      const verticalDistance =
        touch.clientY - startYRef.current;

      const horizontalDistance = Math.abs(
        touch.clientX - startXRef.current
      );

      if (window.scrollY > 0) {
        pullingRef.current = false;
        updateDistance(0);
        return;
      }

      if (
        verticalDistance <= 0 ||
        verticalDistance <= horizontalDistance
      ) {
        if (verticalDistance < 0) {
          pullingRef.current = false;
          updateDistance(0);
        }

        return;
      }

      event.preventDefault();

      /*
        Resistance makes the pull feel like a native
        mobile app instead of directly following the finger.
      */
      const resistedDistance =
        verticalDistance * 0.52;

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(
          animationFrameRef.current
        );
      }

      animationFrameRef.current =
        window.requestAnimationFrame(() => {
          updateDistance(resistedDistance);
        });
    }

    function startRefresh() {
      if (refreshingRef.current) {
        return;
      }

      refreshingRef.current = true;
      setRefreshing(true);
      updateDistance(TRIGGER_DISTANCE);

      window.dispatchEvent(
        new CustomEvent("NeFo:refresh", {
          detail: {
            source: "pull-to-refresh",
          },
        })
      );

      refreshTimerRef.current =
        window.setTimeout(() => {
          window.location.reload();
        }, REFRESH_DELAY);
    }

    function handleTouchEnd() {
      if (!pullingRef.current) {
        return;
      }

      pullingRef.current = false;

      if (
        distanceRef.current >=
        TRIGGER_DISTANCE
      ) {
        startRefresh();
        return;
      }

      updateDistance(0);
    }

    function handleTouchCancel() {
      pullingRef.current = false;

      if (!refreshingRef.current) {
        updateDistance(0);
      }
    }

    window.addEventListener(
      "touchstart",
      handleTouchStart,
      {
        passive: true,
      }
    );

    window.addEventListener(
      "touchmove",
      handleTouchMove,
      {
        passive: false,
      }
    );

    window.addEventListener(
      "touchend",
      handleTouchEnd,
      {
        passive: true,
      }
    );

    window.addEventListener(
      "touchcancel",
      handleTouchCancel,
      {
        passive: true,
      }
    );

    return () => {
      window.removeEventListener(
        "touchstart",
        handleTouchStart
      );

      window.removeEventListener(
        "touchmove",
        handleTouchMove
      );

      window.removeEventListener(
        "touchend",
        handleTouchEnd
      );

      window.removeEventListener(
        "touchcancel",
        handleTouchCancel
      );

      if (animationFrameRef.current) {
        window.cancelAnimationFrame(
          animationFrameRef.current
        );
      }

      if (refreshTimerRef.current) {
        window.clearTimeout(
          refreshTimerRef.current
        );
      }

      htmlElement.style.overscrollBehaviorY =
        previousHtmlOverscroll;

      bodyElement.style.overscrollBehaviorY =
        previousBodyOverscroll;
    };
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  const progress = Math.min(
    pullDistance / TRIGGER_DISTANCE,
    1
  );

  const indicatorVisible =
    refreshing || pullDistance > 5;

  const indicatorOffset = refreshing
    ? 0
    : Math.min(
        pullDistance - TRIGGER_DISTANCE,
        0
      );

  const label = refreshing
    ? "Refreshing..."
    : pullDistance >= TRIGGER_DISTANCE
      ? "Release to refresh"
      : "Pull to refresh";

  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[1200] flex h-11 items-center gap-2 rounded-full border border-[#D8C9B3] bg-white/95 px-4 text-xs font-black text-[#3F5128] shadow-[0_8px_24px_rgba(63,81,40,0.18)] backdrop-blur-xl transition-[opacity,transform] duration-150"
      style={{
        top: "calc(env(safe-area-inset-top) + 12px)",
        opacity: indicatorVisible
          ? Math.max(0.35, progress)
          : 0,
        transform: `translate(-50%, ${indicatorOffset}px)`,
      }}
      role="status"
      aria-live="polite"
      aria-hidden={!indicatorVisible}
    >
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF0DF] text-[#3F5128]">
        {refreshing ? (
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 animate-spin"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
          >
            <path d="M20 6v5h-5" />
            <path d="M18.5 9A7 7 0 1 0 19 15" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 transition-transform duration-100"
            style={{
              transform: `rotate(${progress * 180}deg)`,
            }}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 4v14" />
            <path d="M6.5 12.5 12 18l5.5-5.5" />
          </svg>
        )}
      </div>

      <span>{label}</span>
    </div>
  );
}