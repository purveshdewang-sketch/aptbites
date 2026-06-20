export default function Card({
  children,
  className = "",
  onClick,
}) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={`
        w-full
        bg-white
        border
        border-[#E8F4F1]
        rounded-3xl
        p-4
        shadow-sm
        active:scale-[0.99]
        transition-all
        ${className}
      `}
    >
      {children}
    </Component>
  );
}