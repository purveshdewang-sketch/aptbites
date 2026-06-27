export default function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  autoFocus = false,
  disabled = false,
  onClear,
}) {
  const hasValue = String(value || "").length > 0;

  function handleClear() {
    if (onClear) {
      onClear();
      return;
    }

    if (onChange) {
      onChange({ target: { value: "" } });
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none absolute left-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-base">
        🔍
      </div>

      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        className="
          h-12
          w-full
          rounded-2xl
          border
          border-[#BDEFE6]
          bg-white
          pl-12
          pr-12
          text-base
          font-semibold
          text-[#111827]
          shadow-[5px_5px_14px_rgba(7,59,53,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]
          outline-none
          placeholder:text-[#8AA5A0]
          transition-all
          focus:border-[#41D3BD]
          focus:bg-[#FFFFF2]
          disabled:cursor-not-allowed
          disabled:opacity-60
        "
      />

      {hasValue && !disabled ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#BDEFE6] bg-[#FFFFF2] text-sm font-black text-[#073B35] active:scale-95"
          aria-label="Clear search"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}