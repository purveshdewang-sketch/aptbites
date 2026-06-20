import Badge from "./Badge";

export default function RestaurantCard({
  restaurant,
  onClick,
}) {
  if (!restaurant) return null;

  return (
    <button
      onClick={onClick}
      className="
        w-full
        bg-white
        border
        border-[#E8F4F1]
        rounded-3xl
        overflow-hidden
        shadow-sm
        active:scale-[0.99]
        transition-all
      "
    >
      <div className="aspect-[16/8] bg-[#E8F4F1]">
        {restaurant.image ? (
          <img
            src={restaurant.image}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            🏠
          </div>
        )}
      </div>

      <div className="p-4 text-left">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-lg text-[#073B35]">
            {restaurant.name}
          </h3>

          <Badge color="success">
            ⭐ {restaurant.rating || 5}
          </Badge>
        </div>

        <p className="text-sm text-[#7A8A86] mt-2">
          {restaurant.location || "Nearby"}
        </p>

        <p className="text-xs text-[#7A8A86] mt-1">
          {restaurant.deliveryTime || "20 mins"}
        </p>
      </div>
    </button>
  );
}