import PrimaryButton from "./PrimaryButton";

export default function EmptyState({
  icon = "🍲",
  title = "Nothing here yet",
  description = "",
  buttonText = "",
  onButtonClick,
  className = "",
  compact = false,
}) {
  return (
    <div
      className={`
        rounded-[28px]
        border
        border-[#D7F5EF]
        bg-white/90
        text-center
        shadow-[8px_8px_22px_rgba(7,59,53,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]
        ${compact ? "px-5 py-8" : "px-6 py-12"}
        ${className}
      `}
    >
      <div
        className={`
          mx-auto
          flex
          items-center
          justify-center
          rounded-[24px]
          border
          border-[#BDEFE6]
          bg-[#FFFFF2]
          shadow-[5px_5px_14px_rgba(7,59,53,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]
          ${compact ? "h-16 w-16 text-3xl" : "h-20 w-20 text-5xl"}
        `}
      >
        {icon}
      </div>

      <h2
        className={`
          font-black
          leading-tight
          text-[#073B35]
          ${compact ? "mt-4 text-xl" : "mt-5 text-2xl"}
        `}
      >
        {title}
      </h2>

      {description ? (
        <p className="mx-auto mt-3 max-w-xs text-sm font-semibold leading-relaxed text-[#51615D]">
          {description}
        </p>
      ) : null}

      {buttonText ? (
        <div className="mt-6">
          <PrimaryButton onClick={onButtonClick}>{buttonText}</PrimaryButton>
        </div>
      ) : null}
    </div>
  );
}