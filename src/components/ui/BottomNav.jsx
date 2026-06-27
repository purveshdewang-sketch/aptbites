import { NavLink } from "react-router-dom";

const navItems = [
  {
    label: "Home",
    path: "/",
    icon: (
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
    ),
  },
  {
    label: "Search",
    path: "/marketplace",
    icon: (
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
    ),
  },
  {
    label: "Orders",
    path: "/orders",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M7 3h10l1 4H6l1-4z" />
        <path d="M6 7h12v14H6z" />
        <path d="M9 11h6" />
        <path d="M9 15h6" />
      </svg>
    ),
  },
  {
    label: "Profile",
    path: "/profile",
    icon: (
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
    ),
  },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[900] border-t border-[#D7F5EF] bg-[#FFFFF2]/95 shadow-[0_-8px_24px_rgba(7,59,53,0.06)] backdrop-blur-xl">
      <div className="mx-auto grid h-[72px] max-w-md grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
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
                  className={`flex h-8 w-8 items-center justify-center rounded-2xl border transition-all ${
                    isActive
                      ? "border-[#BDEFE6] bg-[#D7F5EF] shadow-[4px_4px_10px_rgba(7,59,53,0.08),-4px_-4px_10px_rgba(255,255,255,0.9)]"
                      : "border-transparent"
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