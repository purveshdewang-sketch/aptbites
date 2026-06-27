export default function Avatar({
  name = "",
  email = "",
  image = "",
  size = "md",
  className = "",
}) {
  const initial = getInitial(name, email);

  const sizeClass = {
    sm: "h-9 w-9 text-sm rounded-2xl",
    md: "h-11 w-11 text-base rounded-2xl",
    lg: "h-14 w-14 text-xl rounded-[20px]",
  }[size];

  return (
    <div
      className={`
        flex
        shrink-0
        items-center
        justify-center
        overflow-hidden
        border
        border-[#BDEFE6]
        bg-[#41D3BD]
        font-black
        text-[#073B35]
        shadow-[4px_4px_10px_rgba(7,59,53,0.08),-4px_-4px_10px_rgba(255,255,255,0.95)]
        ${sizeClass}
        ${className}
      `}
    >
      {image ? (
        <img
          src={image}
          alt={name || email || "User"}
          className="h-full w-full object-cover"
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}

function getInitial(name, email) {
  const source = String(name || email || "N").trim();

  if (!source) return "N";

  return source.charAt(0).toUpperCase();
}