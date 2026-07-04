import { Link, useNavigate } from "react-router-dom";

export default function AppTopBar({
  title = "NeFo",
  subtitle = "",
  backTo = "",
  right = null,
  showBack = true,
  className = "",
}) {
  const navigate = useNavigate();

  function handleBack() {
    if (backTo) {
      navigate(backTo);
      return;
    }

    navigate(-1);
  }

  return (
    <header
      className={`
        sticky
        top-0
        z-[850]
        border-b
        border-[#D7F5EF]
        bg-[#FFFFF2]/95
        px-4
        py-3
        shadow-[0_8px_24px_rgba(7,59,53,0.06)]
        backdrop-blur-xl
        ${className}
      `}
    >
      <div className="mx-auto flex max-w-md items-center gap-3">
        {showBack ? (
          <button
            type="button"
            onClick={handleBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#BDEFE6] bg-white text-[#073B35] shadow-[4px_4px_10px_rgba(7,59,53,0.08),-4px_-4px_10px_rgba(255,255,255,0.95)] active:scale-95"
            aria-label="Go back"
          >
            <BackIcon />
          </button>
        ) : (
          <Link
            to="/"
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#BDEFE6] bg-white shadow-[4px_4px_10px_rgba(7,59,53,0.08),-4px_-4px_10px_rgba(255,255,255,0.95)]"
            aria-label="Go home"
          >
            <img
              src="/NeFo-logo.png"
              alt="NeFo"
              className="h-full w-full scale-[1.65] object-cover"
            />
          </Link>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-black text-[#073B35]">
            {title}
          </h1>

          {subtitle ? (
            <p className="mt-0.5 truncate text-xs font-semibold text-[#51615D]">
              {subtitle}
            </p>
          ) : null}
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </header>
  );
}

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}