export default function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
}) {
  return (
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg">
        🔍
      </span>

      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="
          w-full
          h-12
          rounded-2xl
          bg-white
          border
          border-[#D7F5EF]
          pl-12
          pr-4
          outline-none
          focus:border-[#41D3BD]
        "
      />
    </div>
  );
}