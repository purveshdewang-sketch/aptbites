export default function StatCard({
  label,
  value,
  icon,
  tone = "default",
  subtitle = "",
}) {
  const toneClasses = {
    default: "bg-white border-[#D7F5EF] text-[#073B35]",
    success: "bg-green-50 border-green-200 text-green-700",
    warning: "bg-orange-50 border-orange-200 text-orange-700",
    danger: "bg-red-50 border-red-200 text-red-600",
    accent: "bg-[#EFFFFB] border-[#41D3BD]/45 text-[#073B35]",
  };

  return (
    <div
      className={`rounded-2xl border p-3 shadow-sm ${
        toneClasses[tone] || toneClasses.default
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-black text-[#51615D] leading-tight">
          {label}
        </p>

        {icon && <span className="text-lg shrink-0">{icon}</span>}
      </div>

      <h3 className="text-2xl font-black mt-1 leading-tight">{value}</h3>

      {subtitle && (
        <p className="text-[11px] text-[#51615D] font-bold mt-1 truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
}