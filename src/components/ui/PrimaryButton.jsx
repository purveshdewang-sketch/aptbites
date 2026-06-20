export default function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled = false,
  className = "",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        w-full
        h-12
        rounded-2xl
        bg-[#073B35]
        hover:bg-[#0B5149]
        active:scale-[0.98]
        disabled:opacity-50
        disabled:cursor-not-allowed
        text-white
        font-black
        transition-all
        duration-200
        shadow-lg
        shadow-[#073B35]/15
        ${className}
      `}
    >
      {children}
    </button>
  );
}