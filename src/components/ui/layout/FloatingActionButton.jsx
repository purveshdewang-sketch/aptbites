export default function FloatingActionButton({
  icon = "➕",
  label = "",
  onClick,
  href = "",
  className = "",
  disabled = false,
  ariaLabel = "",
  size = "md",
  variant = "dark",
  target = "",
  rel = "",
}) {
  const buttonLabel = ariaLabel || label || "Floating action";

  const sizeClass = {
    sm: "h-12 min-w-12 px-3 rounded-2xl text-sm",
    md: "h-14 min-w-14 px-4 rounded-2xl text-sm",
    lg: "h-16 min-w-16 px-5 rounded-[22px] text-base",
  }[size];

  const variantClass = {
    dark: "border-[#073B35] bg-[#073B35] text-white shadow-[#073B35]/20",
    mint: "border-[#41D3BD] bg-[#41D3BD] text-[#073B35] shadow-[#41D3BD]/25",
    white: "border-[#BDEFE6] bg-white text-[#073B35] shadow-[#073B35]/10",
    danger: "border-red-500 bg-red-500 text-white shadow-red-500/20",
  }[variant];

  const safeRel =
    rel || (target === "_blank" ? "noopener noreferrer" : undefined);

  const content = (
    <>
      <span className="text-xl leading-none">{icon}</span>

      {label ? (
        <span className="whitespace-nowrap font-black">{label}</span>
      ) : null}
    </>
  );

  const baseClass = `
    fixed
    right-4
    bottom-[calc(6rem+env(safe-area-inset-bottom))]
    z-[950]
    inline-flex
    items-center
    justify-center
    gap-2
    border
    font-black
    shadow-lg
    transition-all
    active:scale-95
    disabled:cursor-not-allowed
    disabled:opacity-50
    md:bottom-6
    ${sizeClass}
    ${variantClass}
    ${className}
  `;

  if (href && !disabled) {
    return (
      <a
        href={href}
        target={target || undefined}
        rel={safeRel}
        className={baseClass}
        aria-label={buttonLabel}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={baseClass}
      aria-label={buttonLabel}
    >
      {content}
    </button>
  );
}