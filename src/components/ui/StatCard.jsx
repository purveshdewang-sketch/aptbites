export default function StatCard({
  label,
  value,
  icon = null,
  tone = "default",
  subtitle = "",
  className = "",
  compact = false,
}) {
  const toneClasses = {
    default: "border-[#D7F5EF] bg-white/90 text-[#073B35]",
    success: "border-green-200 bg-green-50 text-green-700",
    warning: "border-yellow-200 bg-yellow-50 text-yellow-700",
    danger: "border-red-200 bg-red-50 text-red-600",
    accent: "border-[#BDEFE6] bg-[#41D3BD]/12 text-[#073B35]",
    dark: "border-[#073B35] bg-[#073B35] text-white",
  };

  const mutedText = tone === "dark" ? "text-[#D7F5EF]" : "text-[#51615D]";

  return (
    <div
      className={`
        relative
        overflow-hidden
        rounded-[22px]
        border
        shadow-[5px_5px_14px_rgba(7,59,53,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]
        ${compact ? "p-3" : "p-4"}
        ${toneClasses[tone] || toneClasses.default}
        ${className}
      `}
    >
      <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/25 blur-2xl" />

      <div className="relative flex items-start justify-between gap-2">
        <p
          className={`
            text-[10px]
            font-black
            uppercase
            leading-tight
            tracking-wide
            ${mutedText}
          `}
        >
          {label}
        </p>

        {icon ? (
          <span className="shrink-0 text-lg leading-none">{icon}</span>
        ) : null}
      </div>

      <h3
        className={`
          relative
          mt-2
          font-black
          leading-tight
          ${compact ? "text-xl" : "text-2xl"}
        `}
      >
        {value}
      </h3>

      {subtitle ? (
        <p
          className={`
            relative
            mt-1
            truncate
            text-[11px]
            font-bold
            ${mutedText}
          `}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}