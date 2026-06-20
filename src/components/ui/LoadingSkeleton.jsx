export default function LoadingSkeleton({
  rows = 3,
}) {
  return (
    <div className="space-y-4">
      {[...Array(rows)].map((_, index) => (
        <div
          key={index}
          className="bg-white border border-[#D7F5EF] rounded-3xl p-5 animate-pulse"
        >
          <div className="h-5 bg-[#D7F5EF] rounded-full w-1/3" />

          <div className="h-4 bg-[#D7F5EF] rounded-full w-2/3 mt-4" />

          <div className="h-20 bg-[#D7F5EF] rounded-2xl mt-5" />
        </div>
      ))}
    </div>
  );
}