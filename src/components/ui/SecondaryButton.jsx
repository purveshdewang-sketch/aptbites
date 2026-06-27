export default function SecondaryButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  loading = false,
  icon = null,
  fullWidth = true,
  size = "md",
  className = "",
}) {
  const sizeClass = {
    sm: "h-10 px-4 text-sm rounded-2xl",
    md: "h-12 px-5 text-base rounded-2xl",
    lg: "h-14 px-6 text-base rounded-[22px]",
  }[size];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex
        items-center
        justify-center
        gap-2
        border
        border-[#BDEFE6]
        bg-white
        font-black
        text-[#073B35]
        shadow-[5px_5px_14px_rgba(7,59,53,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]
        transition-all
        duration-200
        hover:bg-[#D7F5EF]
        active:scale-[0.98]
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${fullWidth ? "w-full" : "w-auto"}
        ${sizeClass}
        ${className}
      `}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#073B35]/25 border-t-[#073B35]" />
      ) : icon ? (
        <span className="text-lg leading-none">{icon}</span>
      ) : null}

      <span>{loading ? "Please wait..." : children}</span>
    </button>
  );
}