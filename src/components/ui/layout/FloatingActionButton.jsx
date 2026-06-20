export default function FloatingActionButton({
  icon = "➕",
  label = "",
  onClick,
  href = "",
  className = "",
}) {
  const content = (
    <>
      <span className="text-xl leading-none">{icon}</span>

      {label && (
        <span className="text-sm font-black whitespace-nowrap">{label}</span>
      )}
    </>
  );

  const baseClass = `
    fixed
    right-4
    bottom-24
    z-40
    min-w-14
    h-14
    px-4
    rounded-2xl
    bg-[#073B35]
    text-white
    shadow-lg
    shadow-[#073B35]/20
    flex
    items-center
    justify-center
    gap-2
    active:scale-95
    transition-all
    md:bottom-6
    ${className}
  `;

  if (href) {
    return (
      <a href={href} className={baseClass}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={baseClass}>
      {content}
    </button>
  );
}