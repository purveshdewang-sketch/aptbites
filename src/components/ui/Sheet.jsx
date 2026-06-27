import { useEffect } from "react";

export default function Sheet({
  open = false,
  onClose,
  title = "",
  description = "",
  children,
  footer = null,
  className = "",
}) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event) {
      if (event.key === "Escape" && onClose) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000]">
      <button
        type="button"
        aria-label="Close sheet"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-[#073B35]/55 backdrop-blur-sm"
      />

      <section
        className={`
          absolute
          bottom-0
          left-0
          right-0
          mx-auto
          max-h-[88vh]
          max-w-md
          overflow-hidden
          rounded-t-[32px]
          border
          border-[#D7F5EF]
          bg-[#FFFFF2]
          shadow-[0_-12px_32px_rgba(7,59,53,0.18)]
          ${className}
        `}
      >
        <div className="flex justify-center px-4 pt-3">
          <div className="h-1.5 w-12 rounded-full bg-[#BDEFE6]" />
        </div>

        <header className="flex items-start justify-between gap-3 border-b border-[#D7F5EF] px-5 py-4">
          <div className="min-w-0 flex-1">
            {title ? (
              <h2 className="text-xl font-black leading-tight text-[#073B35]">
                {title}
              </h2>
            ) : null}

            {description ? (
              <p className="mt-1 text-sm font-semibold leading-relaxed text-[#51615D]">
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#BDEFE6] bg-white text-lg font-black text-[#073B35] active:scale-95"
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className="max-h-[58vh] overflow-y-auto px-5 py-4">
          {children}
        </div>

        {footer ? (
          <footer className="border-t border-[#D7F5EF] bg-[#FFFFF2] px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}