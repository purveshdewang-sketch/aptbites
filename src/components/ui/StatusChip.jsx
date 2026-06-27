export default function StatusChip({
  children,
  color = "default",
  size = "md",
  icon = null,
  className = "",
}) {
  const colors = {
    default: "border-[#BDEFE6] bg-[#41D3BD]/12 text-[#073B35]",
    success: "border-green-200 bg-green-50 text-green-700",
    warning: "border-yellow-200 bg-yellow-50 text-yellow-700",
    danger: "border-red-200 bg-red-50 text-red-600",
    info: "border-blue-200 bg-blue-50 text-blue-700",
    dark: "border-[#073B35] bg-[#073B35] text-white",
    soft: "border-[#BDEFE6] bg-[#FFFFF2] text-[#073B35]",
  };

  const sizes = {
    sm: "px-2.5 py-1 text-[10px]",
    md: "px-3 py-1.5 text-xs",
    lg: "px-4 py-2 text-sm",
  };

  return (
    <span
      className={`
        inline-flex
        w-fit
        items-center
        justify-center
        gap-1.5
        rounded-full
        border
        font-black
        leading-none
        shadow-sm
        ${colors[color] || colors.default}
        ${sizes[size] || sizes.md}
        ${className}
      `}
    >
      {icon ? <span className="leading-none">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
}