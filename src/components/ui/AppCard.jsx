export default function AppCard({
  children,
  className = "",
  padding = "p-4",
  as: Component = "div",
}) {
  return (
    <Component
      className={`
        rounded-[28px]
        border
        border-[#D7F5EF]
        bg-white/90
        ${padding}
        shadow-[8px_8px_22px_rgba(7,59,53,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]
        ${className}
      `}
    >
      {children}
    </Component>
  );
}