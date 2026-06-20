import PrimaryButton from "./PrimaryButton";

export default function EmptyState({
  icon = "🍲",
  title = "Nothing here yet",
  description = "",
  buttonText,
  onButtonClick,
}) {
  return (
    <div className="text-center py-12 px-6 bg-white rounded-3xl border border-[#D7F5EF]">
      <div className="text-6xl">{icon}</div>

      <h2 className="text-2xl font-black mt-4 text-[#073B35]">
        {title}
      </h2>

      {description && (
        <p className="text-[#51615D] mt-3 leading-relaxed">
          {description}
        </p>
      )}

      {buttonText && (
        <div className="mt-6">
          <PrimaryButton onClick={onButtonClick}>
            {buttonText}
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}