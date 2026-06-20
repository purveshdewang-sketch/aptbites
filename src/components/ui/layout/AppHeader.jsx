import { Link, useLocation, useNavigate } from "react-router-dom";

export default function AppHeader({
  title = "Nefo",
  subtitle = "",
  showBack = false,
  rightAction = null,
  notificationCount = 0,
  showNotification = false,
  centered = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome =
    location.pathname === "/" || location.pathname === "/marketplace";

  return (
    <header className="sticky top-0 z-50 bg-[#FFFFF2]/95 backdrop-blur-xl border-b border-[#E8F4F1]">
      <div className="max-w-5xl mx-auto h-16 px-4 flex items-center justify-between">

        {/* LEFT */}

        <div className="flex items-center gap-3 min-w-0">

          {showBack ? (
            <button
              onClick={() => navigate(-1)}
              className="
                w-11
                h-11
                rounded-2xl
                bg-white
                border
                border-[#D7F5EF]
                active:scale-95
                transition
              "
            >
              ←
            </button>
          ) : (
            <Link
              to="/"
              className="
                w-11
                h-11
                rounded-2xl
                bg-[#073B35]
                text-white
                flex
                items-center
                justify-center
                font-black
                text-lg
              "
            >
              N
            </Link>
          )}

          <div
            className={`min-w-0 ${
              centered ? "text-center" : ""
            }`}
          >
            <h1 className="text-lg font-black text-[#073B35] truncate">
              {title}
            </h1>

            {subtitle && (
              <p className="text-xs text-[#7A8A86] truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* RIGHT */}

        <div className="flex items-center gap-2">

          {rightAction}

          {showNotification && (
            <button
              className="
                relative
                w-11
                h-11
                rounded-2xl
                bg-white
                border
                border-[#D7F5EF]
                active:scale-95
                transition
              "
            >
              🔔

              {notificationCount > 0 && (
                <span
                  className="
                    absolute
                    -top-1
                    -right-1
                    min-w-[18px]
                    h-[18px]
                    px-1
                    rounded-full
                    bg-red-500
                    text-white
                    text-[10px]
                    font-black
                    flex
                    items-center
                    justify-center
                  "
                >
                  {notificationCount}
                </span>
              )}
            </button>
          )}

          {isHome && (
            <div
              className="
                hidden
                md:flex
                text-xs
                text-[#7A8A86]
                font-bold
              "
            >
              Fresh Homemade Food
            </div>
          )}
        </div>

      </div>
    </header>
  );
}