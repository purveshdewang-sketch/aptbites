export default function StatusChip({
  children,
  color = "default",
}) {
  const colors = {
    default:
      "bg-[#EFFFFB] text-[#073B35] border-[#41D3BD]/40",

    success:
      "bg-green-50 text-green-700 border-green-200",

    warning:
      "bg-orange-50 text-orange-700 border-orange-200",

    danger:
      "bg-red-50 text-red-600 border-red-200",

    info:
      "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <span
      className={`
        inline-flex
        items-center
        px-3
        py-1.5
        rounded-full
        text-xs
        font-black
        border
        ${colors[color] || colors.default}
      `}
    >
      {children}
    </span>
  );
}