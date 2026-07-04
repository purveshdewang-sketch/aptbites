export default function LoadingSkeleton({
  rows = 3,
  variant = "cards",
  className = "",
}) {
  if (variant === "food") {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(rows)].map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[28px] border border-[#D7F5EF] bg-white/90 p-2.5 shadow-[8px_8px_22px_rgba(7,59,53,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]"
          >
            <div className="flex gap-3">
              <ShimmerBlock className="h-[116px] w-[116px] shrink-0 rounded-[22px]" />

              <div className="min-w-0 flex-1 py-1">
                <ShimmerBlock className="h-4 w-3/4 rounded-full" />
                <ShimmerBlock className="mt-3 h-3 w-1/2 rounded-full" />

                <div className="mt-4 flex gap-2">
                  <ShimmerBlock className="h-6 w-20 rounded-full" />
                  <ShimmerBlock className="h-6 w-16 rounded-full" />
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <ShimmerBlock className="h-3 w-24 rounded-full" />
                  <ShimmerBlock className="h-9 w-20 rounded-2xl" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "dashboard") {
    return (
      <div className={`space-y-5 ${className}`}>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, index) => (
            <div
              key={index}
              className="rounded-[22px] border border-[#D7F5EF] bg-white/90 p-4 shadow-[5px_5px_14px_rgba(7,59,53,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]"
            >
              <ShimmerBlock className="h-3 w-16 rounded-full" />
              <ShimmerBlock className="mt-4 h-7 w-20 rounded-full" />
            </div>
          ))}
        </div>

        {[...Array(rows)].map((_, index) => (
          <SkeletonCard key={index} index={index} />
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {[...Array(rows)].map((_, index) => (
        <SkeletonCard key={index} index={index} />
      ))}
    </div>
  );
}

function SkeletonCard({ index }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#D7F5EF] bg-white/90 p-5 shadow-[8px_8px_22px_rgba(7,59,53,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#41D3BD]/10 blur-2xl" />

      <div className="relative flex items-start gap-4">
        <ShimmerBlock className="h-14 w-14 shrink-0 rounded-[20px]" />

        <div className="min-w-0 flex-1">
          <ShimmerBlock
            className={`h-4 rounded-full ${
              index % 2 === 0 ? "w-2/3" : "w-1/2"
            }`}
          />

          <ShimmerBlock className="mt-3 h-3 w-5/6 rounded-full" />
          <ShimmerBlock className="mt-2 h-3 w-3/5 rounded-full" />
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-3 gap-2">
        <ShimmerBlock className="h-10 rounded-2xl" />
        <ShimmerBlock className="h-10 rounded-2xl" />
        <ShimmerBlock className="h-10 rounded-2xl" />
      </div>

      <div className="relative mt-5">
        <ShimmerBlock className="h-20 rounded-[22px]" />
      </div>
    </div>
  );
}

function ShimmerBlock({ className = "" }) {
  return (
    <div
      className={`
        relative
        overflow-hidden
        border
        border-[#E8F4F1]
        bg-[#D7F5EF]
        before:absolute
        before:inset-y-0
        before:-left-1/2
        before:w-1/2
        before:animate-[NeFoShimmer_1.45s_ease-in-out_infinite]
        before:bg-gradient-to-r
        before:from-transparent
        before:via-white/70
        before:to-transparent
        ${className}
      `}
    />
  );
}