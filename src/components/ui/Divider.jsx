export default function Divider({
  className = "",
  vertical = false,
  strong = false,
}) {
  if (vertical) {
    return (
      <div
        className={`
          h-full
          w-px
          shrink-0
          ${strong ? "bg-[#BDEFE6]" : "bg-[#E8F4F1]"}
          ${className}
        `}
      />
    );
  }

  return (
    <div
      className={`
        h-px
        w-full
        shrink-0
        ${strong ? "bg-[#BDEFE6]" : "bg-[#E8F4F1]"}
        ${className}
      `}
    />
  );
}