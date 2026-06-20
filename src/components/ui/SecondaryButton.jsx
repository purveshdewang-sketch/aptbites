export default function SecondaryButton({
  children,
  onClick,
  type = "button",
  className = "",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`
        w-full
        h-12
        rounded-2xl
        border
        border-[#41D3BD]/40
        bg-white
        hover:bg-[#D7F5EF]
        active:scale-[0.98]
        text-[#073B35]
        font-black
        transition-all
        duration-200
        ${className}
      `}
    >
      {children}
    </button>
  );
}