export default function PrimaryButton({
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
        border-[#073B35]
        bg-[#073B35]
        font-black
        text-white
        shadow-lg
        shadow-[#073B35]/15
        transition-all
        duration-200
        active:scale-[0.98]
        hover:bg-[#0B5149]
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${fullWidth ? "w-full" : "w-auto"}
        ${sizeClass}
        ${className}
      `}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
      ) : icon ? (
        <span className="text-lg leading-none">{icon}</span>
      ) : null}

      <span>{loading ? "Please wait..." : children}</span>
    </button>
  );
}