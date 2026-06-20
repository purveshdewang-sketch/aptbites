import AppHeader from "./AppHeader";
import BottomNavigation from "./BottomNavigation";
import FloatingActionButton from "./FloatingActionButton";

export default function PageShell({
  children,

  title = "",

  subtitle = "",

  showHeader = true,

  showBottomNav = true,

  showFAB = false,

  fabIcon = "➕",

  onFabClick,

  mode = "customer",

  className = "",

  contentClassName = "",

  maxWidth = "max-w-5xl",

  safeArea = true,
}) {
  return (
    <div className="min-h-screen bg-[#FFFFF2] text-[#111827]">
      {showHeader && (
        <AppHeader
          title={title}
          subtitle={subtitle}
        />
      )}

      <main
        className={`
          px-4
          pt-4
          ${safeArea ? "pb-24" : ""}
          ${className}
        `}
      >
        <div className={`${maxWidth} mx-auto ${contentClassName}`}>
          {children}
        </div>
      </main>

      {showFAB && (
        <FloatingActionButton
          icon={fabIcon}
          onClick={onFabClick}
        />
      )}

      {showBottomNav && (
        <BottomNavigation mode={mode} />
      )}
    </div>
  );
}