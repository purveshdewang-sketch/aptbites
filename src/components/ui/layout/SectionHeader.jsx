export default function Badge({
  children,
  color = "primary",
}) {
  const styles = {
    primary:
      "bg-[#41D3BD]/15 text-[#073B35]",

    success:
      "bg-green-50 text-green-700",

    warning:
      "bg-orange-50 text-orange-700",

    danger:
      "bg-red-50 text-red-600",

    info:
      "bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={`
        inline-flex
        items-center
        justify-center
        rounded-full
        px-3
        py-1
        text-xs
        font-black
        ${styles[color]}
      `}
    >
      {children}
    </span>
  );
}