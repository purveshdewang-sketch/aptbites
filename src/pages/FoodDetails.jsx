import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import FoodCard from "../components/FoodCard";
import { supabase } from "../lib/supabaseClient";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

const FAVORITES_STORAGE_KEY =
  "NeFo_favorite_foods";

const KITCHEN_MENU_CATEGORIES = [
  "Meals",
  "Breakfast",
  "Snacks",
  "Sweets",
  "Drinks",
  "Tiffin",
  "Specials",
];

const COMPLETED_ORDER_STATUSES =
  new Set([
    "completed",
    "delivered",
  ]);

function createRealtimeChannelName(
  foodId
) {
  const uniquePart =
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID ===
      "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`;

  return `NeFo-food-details-${foodId}-${uniquePart}`;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function parseOrderItems(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    typeof value !== "string"
  ) {
    return [];
  }

  try {
    const parsedValue =
      JSON.parse(value);

    return Array.isArray(
      parsedValue
    )
      ? parsedValue
      : [];
  } catch {
    return [];
  }
}

function getOrderedFoodId(item) {
  return String(
    item?.id ||
      item?.food_id ||
      item?.foodId ||
      ""
  );
}

function orderContainsFood(
  order,
  foodId
) {
  const targetFoodId =
    String(foodId || "");

  if (!targetFoodId) {
    return false;
  }

  return parseOrderItems(
    order?.items
  ).some(
    (item) =>
      getOrderedFoodId(item) ===
      targetFoodId
  );
}

function isRowLevelSecurityError(
  error
) {
  const errorText =
    normalizeText(
      error?.message
    );

  return (
    errorText.includes(
      "row-level security"
    ) ||
    errorText.includes(
      "violates row-level security policy"
    )
  );
}

function getFavoriteId(item) {
  return String(item?.id || "");
}

function readFavorites() {
  try {
    const saved =
      localStorage.getItem(
        FAVORITES_STORAGE_KEY
      );

    const parsed = saved
      ? JSON.parse(saved)
      : [];

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(
    FAVORITES_STORAGE_KEY,
    JSON.stringify(favorites)
  );

  window.dispatchEvent(
    new CustomEvent(
      "NeFo_favorites_updated"
    )
  );
}

function isItemFavorite(item) {
  const itemId =
    getFavoriteId(item);

  if (!itemId) {
    return false;
  }

  return readFavorites().some(
    (favoriteItem) =>
      getFavoriteId(
        favoriteItem
      ) === itemId
  );
}

function buildFavoriteItem(item) {
  return {
    ...item,

    seller_id:
      item.seller_id ||
      item.user_id,

    favorite_saved_at:
      new Date().toISOString(),
  };
}

function buildRatingMap(ratingRows) {
  const ratingMap = {};

  (ratingRows || []).forEach(
    (ratingRow) => {
      const foodId = String(
        ratingRow.food_id || ""
      );

      const ratingValue = Number(
        ratingRow.rating || 0
      );

      if (
        !foodId ||
        ratingValue < 1 ||
        ratingValue > 5
      ) {
        return;
      }

      if (!ratingMap[foodId]) {
        ratingMap[foodId] = {
          total: 0,
          count: 0,
        };
      }

      ratingMap[foodId].total +=
        ratingValue;

      ratingMap[foodId].count += 1;
    }
  );

  return ratingMap;
}

function getFoodRating(
  ratingMap,
  foodId
) {
  const ratingData =
    ratingMap[
      String(foodId)
    ] || {
      total: 0,
      count: 0,
    };

  return {
    average:
      ratingData.count > 0
        ? ratingData.total /
          ratingData.count
        : 0,

    count:
      ratingData.count,
  };
}

export default function FoodDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    cartItems,
    addToCart,
    increaseQuantity,
    decreaseQuantity,
    cartCount,
  } = useCart();

  const [food, setFood] =
    useState(null);

  const [
    kitchenFoods,
    setKitchenFoods,
  ] = useState([]);

  const [
    kitchenOnline,
    setKitchenOnline,
  ] = useState(true);

  const [
    deliveryAvailable,
    setDeliveryAvailable,
  ] = useState(true);

  const [
    pickupAvailable,
    setPickupAvailable,
  ] = useState(true);

  const [
    selectedKitchenCategory,
    setSelectedKitchenCategory,
  ] = useState("All");

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [liked, setLiked] =
    useState(false);

  const [toast, setToast] =
    useState(null);

  const [
    ratingAverage,
    setRatingAverage,
  ] = useState(0);

  const [
    ratingCount,
    setRatingCount,
  ] = useState(0);

  const [
    userRating,
    setUserRating,
  ] = useState(0);

  const [
    ratingSaving,
    setRatingSaving,
  ] = useState(false);

  const [
    ratingError,
    setRatingError,
  ] = useState("");

  const [
    canRateFood,
    setCanRateFood,
  ] = useState(false);

  const [
    ratingEligibilityLoading,
    setRatingEligibilityLoading,
  ] = useState(true);

  const [
    ratingEligibilityMessage,
    setRatingEligibilityMessage,
  ] = useState(
    "Complete an order containing this dish to rate it."
  );

  const cartItem =
    cartItems.find(
      (currentCartItem) =>
        String(
          currentCartItem.id
        ) === String(id)
    );

  const quantity = cartItem
    ? Number(
        cartItem.quantity || 0
      )
    : 0;

  const computedCartCount =
    useMemo(() => {
      if (
        typeof cartCount ===
        "number"
      ) {
        return cartCount;
      }

      return cartItems.reduce(
        (total, item) =>
          total +
          Number(
            item.quantity || 0
          ),
        0
      );
    }, [
      cartCount,
      cartItems,
    ]);

  const stock = Number(
    food?.stock || 0
  );

  const kitchenName =
    food?.seller_kitchen_name ||
    food?.seller ||
    "Home Kitchen";

  const sellerDoorNo =
    food?.seller_door_no || "";

  const sellerAvatarUrl =
    food?.seller_avatar_url || "";

  const kitchenIsClosed =
    kitchenOnline === false ||
    food?.seller_online ===
      false;

  const fulfillmentUnavailable =
    deliveryAvailable === false &&
    pickupAvailable === false;

  const isSoldOut =
    stock <= 0;

  const isBlocked =
    kitchenIsClosed ||
    fulfillmentUnavailable ||
    isSoldOut;

  const deliveryTime =
    food?.time ||
    food?.delivery_time ||
    "30-40 min";

  useEffect(() => {
    let componentActive = true;

    setSelectedKitchenCategory(
      "All"
    );

    fetchFoodDetails();
    fetchRatingEligibility(id);

    const realtimeChannel =
      supabase
        .channel(
          createRealtimeChannelName(
            id
          )
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "foods",
          },
          () => {
            if (
              componentActive
            ) {
              fetchFoodDetails(
                false
              );
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "profiles",
          },
          () => {
            if (
              componentActive
            ) {
              fetchFoodDetails(
                false
              );
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "food_ratings",
          },
          () => {
            if (
              componentActive
            ) {
              fetchFoodDetails(
                false
              );
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
          },
          () => {
            if (
              componentActive
            ) {
              fetchRatingEligibility(
                id
              );
            }
          }
        );

    realtimeChannel.subscribe(
      (status) => {
        if (
          status ===
          "CHANNEL_ERROR"
        ) {
          console.error(
            "NeFo Food Details realtime channel failed."
          );
        }
      }
    );

    return () => {
      componentActive = false;

      void supabase.removeChannel(
        realtimeChannel
      );
    };
  }, [
    id,
    user?.id,
  ]);

  useEffect(() => {
    function syncFavoriteState() {
      if (!food) {
        return;
      }

      setLiked(
        isItemFavorite(food)
      );
    }

    window.addEventListener(
      "NeFo_favorites_updated",
      syncFavoriteState
    );

    window.addEventListener(
      "storage",
      syncFavoriteState
    );

    return () => {
      window.removeEventListener(
        "NeFo_favorites_updated",
        syncFavoriteState
      );

      window.removeEventListener(
        "storage",
        syncFavoriteState
      );
    };
  }, [food]);

  function showToast({
    icon = "✅",
    title = "Done",
    message:
      toastMessage = "",
    actionLabel = "",
    href = "",
  }) {
    setToast({
      icon,
      title,
      message: toastMessage,
      actionLabel,
      href,
    });

    window.setTimeout(() => {
      setToast(null);
    }, 1600);
  }

  async function fetchRatingEligibility(
    foodId
  ) {
    if (!user?.id) {
      setCanRateFood(false);

      setRatingEligibilityLoading(
        false
      );

      setRatingEligibilityMessage(
        "Please sign in before rating this dish."
      );

      return;
    }

    if (!foodId) {
      setCanRateFood(false);

      setRatingEligibilityLoading(
        false
      );

      setRatingEligibilityMessage(
        "This dish cannot be rated right now."
      );

      return;
    }

    setRatingEligibilityLoading(
      true
    );

    setRatingEligibilityMessage(
      "Checking whether this dish can be rated..."
    );

    const {
      data: rpcResult,
      error: rpcError,
    } = await supabase.rpc(
      "user_can_rate_food",
      {
        target_food_id:
          String(foodId),
      }
    );

    if (!rpcError) {
      const eligible =
        rpcResult === true;

      setCanRateFood(
        eligible
      );

      setRatingEligibilityLoading(
        false
      );

      setRatingEligibilityMessage(
        eligible
          ? "You can rate this dish because it appears in a completed order."
          : "Complete an order containing this dish to rate it."
      );

      return;
    }

    const {
      data: orderRows,
      error: orderError,
    } = await supabase
      .from("orders")
      .select(
        "id, items, status, created_at"
      )
      .eq(
        "user_id",
        user.id
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(100);

    if (orderError) {
      console.error(
        "Rating eligibility check failed:",
        rpcError?.message ||
          orderError.message
      );

      setCanRateFood(false);

      setRatingEligibilityLoading(
        false
      );

      setRatingEligibilityMessage(
        "Rating eligibility could not be verified. Please try again."
      );

      return;
    }

    const eligible = (
      orderRows || []
    ).some((order) => {
      const status =
        normalizeText(
          order?.status
        );

      return (
        COMPLETED_ORDER_STATUSES.has(
          status
        ) &&
        orderContainsFood(
          order,
          foodId
        )
      );
    });

    setCanRateFood(
      eligible
    );

    setRatingEligibilityLoading(
      false
    );

    setRatingEligibilityMessage(
      eligible
        ? "You can rate this dish because it appears in a completed order."
        : "Complete an order containing this dish to rate it."
    );
  }

  async function fetchKitchenProfile(
    kitchenId
  ) {
    if (!kitchenId) {
      return {
        seller_online: true,
        seller_kitchen_name:
          "",
        seller_door_no: "",
        seller_about: "",
        seller_specialty: "",
        delivery_available:
          true,
        pickup_available: true,
        avatar_url: "",
      };
    }

    const {
      data,
      error,
    } = await supabase
      .from("public_seller_profiles")
      .select(
        "id, seller_online, seller_kitchen_name, seller_door_no, seller_about, seller_specialty, delivery_available, pickup_available, avatar_url"
      )
      .eq(
        "id",
        kitchenId
      )
      .maybeSingle();

    if (!error) {
      return {
        seller_online:
          data?.seller_online !==
          false,

        seller_kitchen_name:
          data?.seller_kitchen_name ||
          "",

        seller_door_no:
          data?.seller_door_no ||
          "",

        seller_about:
          data?.seller_about ||
          "",

        seller_specialty:
          data?.seller_specialty ||
          "",

        delivery_available:
          data?.delivery_available !==
          false,

        pickup_available:
          data?.pickup_available !==
          false,

        avatar_url:
          data?.avatar_url || "",
      };
    }

    const {
      data: fallbackData,
    } = await supabase
      .from("public_seller_profiles")
      .select(
        "id, seller_online, seller_kitchen_name, seller_about, seller_specialty, delivery_available, pickup_available"
      )
      .eq(
        "id",
        kitchenId
      )
      .maybeSingle();

    return {
      seller_online:
        fallbackData?.seller_online !==
        false,

      seller_kitchen_name:
        fallbackData
          ?.seller_kitchen_name ||
        "",

      seller_door_no: "",

      seller_about:
        fallbackData
          ?.seller_about ||
        "",

      seller_specialty:
        fallbackData
          ?.seller_specialty ||
        "",

      delivery_available:
        fallbackData
          ?.delivery_available !==
        false,

      pickup_available:
        fallbackData
          ?.pickup_available !==
        false,

      avatar_url: "",
    };
  }

  async function fetchFoodDetails(
    showLoading = true
  ) {
    if (showLoading) {
      setLoading(true);
    }

    setMessage("");
    setRatingError("");

    const {
      data: foodData,
      error: foodError,
    } = await supabase
      .from("foods")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (foodError) {
      setMessage(
        foodError.message
      );

      setFood(null);
      setLoading(false);

      return;
    }

    if (!foodData) {
      setFood(null);
      setKitchenFoods([]);

      setMessage(
        "This dish is no longer available."
      );

      setLoading(false);

      return;
    }

    const kitchenId =
      foodData.user_id ||
      foodData.seller_id;

    const kitchenProfile =
      await fetchKitchenProfile(
        kitchenId
      );

    const finalKitchenName =
      kitchenProfile
        .seller_kitchen_name ||
      foodData
        .seller_kitchen_name ||
      foodData.seller ||
      "Home Kitchen";

    const {
      data: allFoodsData,
      error: allFoodsError,
    } = await supabase
      .from("foods")
      .select("*")
      .order("id", {
        ascending: false,
      });

    const allFoods =
      allFoodsError
        ? [foodData]
        : allFoodsData || [];

    const currentSellerNames = [
      finalKitchenName,
      foodData
        .seller_kitchen_name,
      foodData.seller,
    ]
      .filter(Boolean)
      .map((name) =>
        String(name)
          .trim()
          .toLowerCase()
      );

    const matchingKitchenFoods =
      allFoods.filter((item) => {
        const itemKitchenId =
          item.user_id ||
          item.seller_id;

        const itemNames = [
          item.seller_kitchen_name,
          item.seller,
        ]
          .filter(Boolean)
          .map((name) =>
            String(name)
              .trim()
              .toLowerCase()
          );

        const sameKitchenId =
          kitchenId &&
          itemKitchenId &&
          String(
            itemKitchenId
          ) ===
            String(
              kitchenId
            );

        const sameKitchenName =
          itemNames.some((name) =>
            currentSellerNames.includes(
              name
            )
          );

        return (
          sameKitchenId ||
          sameKitchenName
        );
      });

    const relevantFoodIds = [
      ...new Set(
        [
          foodData,
          ...matchingKitchenFoods,
        ]
          .map(
            (item) =>
              item.id
          )
          .filter(
            (foodId) =>
              foodId !==
                undefined &&
              foodId !== null
          )
      ),
    ];

    let ratingRows = [];

    if (
      relevantFoodIds.length >
      0
    ) {
      const {
        data: ratingsData,
        error: ratingsError,
      } = await supabase
        .from("food_ratings")
        .select(
          "food_id, user_id, rating"
        )
        .in(
          "food_id",
          relevantFoodIds
        );

      if (ratingsError) {
        setRatingError(
          `Ratings could not be loaded: ${ratingsError.message}`
        );
      } else {
        ratingRows =
          ratingsData || [];
      }
    }

    const ratingMap =
      buildRatingMap(
        ratingRows
      );

    const currentFoodRating =
      getFoodRating(
        ratingMap,
        foodData.id
      );

    const currentUserRating =
      user?.id
        ? ratingRows.find(
            (ratingRow) =>
              String(
                ratingRow.food_id
              ) ===
                String(
                  foodData.id
                ) &&
              String(
                ratingRow.user_id
              ) ===
                String(user.id)
          )
        : null;

    const enrichedFood = {
      ...foodData,

      seller_id:
        kitchenId,

      seller_online:
        kitchenProfile
          .seller_online,

      seller_kitchen_name:
        finalKitchenName,

      seller_door_no:
        kitchenProfile
          .seller_door_no ||
        foodData
          .seller_door_no ||
        "",

      seller_about:
        kitchenProfile
          .seller_about ||
        foodData
          .seller_about ||
        "",

      seller_specialty:
        kitchenProfile
          .seller_specialty ||
        foodData
          .seller_specialty ||
        "",

      seller_avatar_url:
        kitchenProfile
          .avatar_url ||
        "",

      delivery_available:
        kitchenProfile
          .delivery_available,

      pickup_available:
        kitchenProfile
          .pickup_available,

      rating_average:
        currentFoodRating
          .average,

      rating_count:
        currentFoodRating.count,
    };

    const enrichedKitchenFoods =
      matchingKitchenFoods
        .filter(
          (item) =>
            String(item.id) !==
            String(id)
        )
        .map((item) => {
          const itemRating =
            getFoodRating(
              ratingMap,
              item.id
            );

          return {
            ...item,

            seller_id:
              item.user_id ||
              item.seller_id ||
              kitchenId,

            seller_online:
              kitchenProfile
                .seller_online,

            seller_kitchen_name:
              kitchenProfile
                .seller_kitchen_name ||
              item
                .seller_kitchen_name ||
              item.seller ||
              finalKitchenName,

            seller_door_no:
              kitchenProfile
                .seller_door_no ||
              item
                .seller_door_no ||
              "",

            seller_avatar_url:
              kitchenProfile
                .avatar_url ||
              "",

            delivery_available:
              kitchenProfile
                .delivery_available,

            pickup_available:
              kitchenProfile
                .pickup_available,

            rating_average:
              itemRating.average,

            rating_count:
              itemRating.count,
          };
        });

    setFood(
      enrichedFood
    );

    setLiked(
      isItemFavorite(
        enrichedFood
      )
    );

    setKitchenOnline(
      kitchenProfile
        .seller_online
    );

    setDeliveryAvailable(
      kitchenProfile
        .delivery_available
    );

    setPickupAvailable(
      kitchenProfile
        .pickup_available
    );

    setRatingAverage(
      currentFoodRating.average
    );

    setRatingCount(
      currentFoodRating.count
    );

    setUserRating(
      Number(
        currentUserRating
          ?.rating ||
          0
      )
    );

    setKitchenFoods(
      enrichedKitchenFoods
    );

    setLoading(false);
  }

  async function submitRating(
    ratingValue
  ) {
    if (!user?.id) {
      setRatingError(
        "Please sign in before rating this dish."
      );

      return;
    }

    if (!food?.id) {
      return;
    }

    if (
      ratingEligibilityLoading
    ) {
      setRatingError(
        "Please wait while NeFo checks whether this dish can be rated."
      );

      return;
    }

    if (!canRateFood) {
      setRatingError(
        ratingEligibilityMessage ||
          "Complete an order containing this dish to rate it."
      );

      return;
    }

    if (
      ratingValue < 1 ||
      ratingValue > 5
    ) {
      return;
    }

    setRatingSaving(true);
    setRatingError("");

    const { error } =
      await supabase
        .from("food_ratings")
        .upsert(
          {
            food_id: food.id,
            user_id: user.id,
            rating:
              ratingValue,
            updated_at:
              new Date()
                .toISOString(),
          },
          {
            onConflict:
              "food_id,user_id",
          }
        );

    if (error) {
      setRatingError(
        isRowLevelSecurityError(
          error
        )
          ? "Complete an order containing this dish before rating it."
          : `Rating could not be saved: ${error.message}`
      );

      if (
        isRowLevelSecurityError(
          error
        )
      ) {
        setCanRateFood(false);

        setRatingEligibilityMessage(
          "Complete an order containing this dish to rate it."
        );
      }

      setRatingSaving(false);

      return;
    }

    setUserRating(
      ratingValue
    );

    showToast({
      icon: "⭐",
      title: "Rating saved",
      message: `You rated ${food.name} ${ratingValue} out of 5.`,
    });

    await fetchFoodDetails(
      false
    );

    setRatingSaving(false);
  }

  const availableKitchenFoods =
    useMemo(() => {
      return kitchenFoods.filter(
        (item) =>
          Number(
            item.stock || 0
          ) > 0 &&
          item.seller_online !==
            false &&
          (item
            .delivery_available !==
            false ||
            item
              .pickup_available !==
              false)
      );
    }, [kitchenFoods]);

  const kitchenCategoryCounts =
    useMemo(() => {
      const counts = {
        All:
          kitchenFoods.length,
      };

      KITCHEN_MENU_CATEGORIES.forEach(
        (categoryName) => {
          counts[
            categoryName
          ] = 0;
        }
      );

      kitchenFoods.forEach(
        (item) => {
          const itemCategory =
            item.category ||
            "Meals";

          if (
            counts[
              itemCategory
            ] !== undefined
          ) {
            counts[
              itemCategory
            ] += 1;
          }
        }
      );

      return counts;
    }, [kitchenFoods]);

  const visibleKitchenFoods =
    useMemo(() => {
      if (
        selectedKitchenCategory ===
        "All"
      ) {
        return kitchenFoods;
      }

      return kitchenFoods.filter(
        (item) =>
          (item.category ||
            "Meals") ===
          selectedKitchenCategory
      );
    }, [
      kitchenFoods,
      selectedKitchenCategory,
    ]);

  function handleAddToCart() {
    if (!food) {
      return;
    }

    if (kitchenIsClosed) {
      alert(
        "This kitchen is closed right now."
      );

      return;
    }

    if (
      fulfillmentUnavailable
    ) {
      alert(
        "This kitchen is not taking delivery or pickup orders right now."
      );

      return;
    }

    if (isSoldOut) {
      alert(
        "This dish is sold out."
      );

      return;
    }

    addToCart(food);
  }

  function handleIncrease() {
    if (
      quantity >= stock
    ) {
      alert(
        "You have reached the available stock limit."
      );

      return;
    }

    increaseQuantity(
      food.id
    );
  }

  function handleDecrease() {
    decreaseQuantity(
      food.id
    );
  }

  function handleToggleFavorite() {
    if (!food) {
      return;
    }

    const itemId =
      getFavoriteId(food);

    if (!itemId) {
      return;
    }

    const currentFavorites =
      readFavorites();

    const alreadyFavorite =
      currentFavorites.some(
        (favoriteItem) =>
          getFavoriteId(
            favoriteItem
          ) === itemId
      );

    if (alreadyFavorite) {
      const nextFavorites =
        currentFavorites.filter(
          (favoriteItem) =>
            getFavoriteId(
              favoriteItem
            ) !== itemId
        );

      saveFavorites(
        nextFavorites
      );

      setLiked(false);

      showToast({
        icon: "♡",
        title:
          "Removed from favorites",
        message: `${food.name} removed from your favorites.`,
        actionLabel:
          "View Favorites",
        href: "/favorites",
      });

      return;
    }

    const favoriteItem =
      buildFavoriteItem(food);

    const nextFavorites = [
      favoriteItem,

      ...currentFavorites.filter(
        (currentFavorite) =>
          getFavoriteId(
            currentFavorite
          ) !== itemId
      ),
    ];

    saveFavorites(
      nextFavorites
    );

    setLiked(true);

    showToast({
      icon: "❤️",
      title:
        "Added to favorites",
      message: `${food.name} saved to your favorites.`,
      actionLabel:
        "View Favorites",
      href: "/favorites",
    });
  }

  function getAvailabilityText() {
    if (kitchenIsClosed) {
      return "Ordering temporarily unavailable";
    }

    if (
      fulfillmentUnavailable
    ) {
      return "Kitchen is not taking orders right now";
    }

    if (isSoldOut) {
      return "Sold out";
    }

    return "";
  }

  function getAvailabilityClass() {
    if (
      kitchenIsClosed ||
      fulfillmentUnavailable ||
      isSoldOut
    ) {
      return "text-red-500";
    }

    return "text-[#0B8F80]";
  }

  function getKitchenStatusText() {
    if (kitchenIsClosed) {
      return "Kitchen Closed";
    }

    if (
      fulfillmentUnavailable
    ) {
      return "Not Taking Orders";
    }

    return "Open now";
  }

  function getMainButtonLabel() {
    if (kitchenIsClosed) {
      return "Kitchen Closed";
    }

    if (
      fulfillmentUnavailable
    ) {
      return "Unavailable";
    }

    if (isSoldOut) {
      return "Sold Out";
    }

    return "Add to Cart";
  }

  function getTypeLabel() {
    return (
      food?.type || "Veg"
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FFFFF2] px-4 py-8 text-[#111827]">
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
          <div className="w-full rounded-[28px] border border-[#E8F4F1] bg-white/90 p-8 text-center shadow-[8px_8px_22px_rgba(7,59,53,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#41D3BD]/12 text-3xl">
              🍽️
            </div>

            <p className="mt-4 font-bold text-[#51615D]">
              Loading dish
              details...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!food) {
    return (
      <main className="min-h-screen bg-[#FFFFF2] px-4 py-8 text-[#111827]">
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
          <div className="w-full rounded-[28px] border border-[#E8F4F1] bg-white/90 p-8 text-center shadow-[8px_8px_22px_rgba(7,59,53,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]">
            <div className="text-5xl">
              🍽️
            </div>

            <h1 className="mt-4 text-3xl font-black text-[#111827]">
              Dish not found
            </h1>

            <p className="mt-3 text-[#51615D]">
              {message ||
                "This dish may have been removed."}
            </p>

            <Link
              to="/marketplace"
              className="mt-7 block rounded-2xl border border-[#073B35] bg-[#073B35] py-4 font-black text-white shadow-lg shadow-[#073B35]/15"
            >
              Back to Marketplace
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFFFF2] pb-32 text-[#111827]">
      {toast ? (
        <div className="fixed left-4 right-4 top-5 z-[999] mx-auto max-w-md rounded-[24px] border border-[#BDEFE6] bg-white p-4 shadow-2xl shadow-[#073B35]/20">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#BDEFE6] bg-[#41D3BD]/15 text-xl">
              {toast.icon}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-black text-[#073B35]">
                {toast.title}
              </p>

              {toast.message ? (
                <p className="mt-1 truncate text-sm font-semibold text-[#51615D]">
                  {
                    toast.message
                  }
                </p>
              ) : null}
            </div>
          </div>

          {toast.href &&
          toast.actionLabel ? (
            <Link
              to={toast.href}
              className="mt-4 block rounded-2xl border border-[#073B35] bg-[#073B35] py-3 text-center font-black text-white"
            >
              {
                toast.actionLabel
              }
            </Link>
          ) : null}
        </div>
      ) : null}

      <section className="mx-auto max-w-md px-4 pb-6 pt-3">
        <div className="relative overflow-hidden rounded-[30px] border border-[#BDEFE6] bg-[#D7F5EF] shadow-[8px_8px_22px_rgba(7,59,53,0.1),-8px_-8px_22px_rgba(255,255,255,0.95)]">
          <div className="absolute left-3 right-3 top-3 z-20 flex items-center justify-between">
            <button
              type="button"
              onClick={() =>
                navigate(-1)
              }
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#BDEFE6] bg-white/90 text-[#073B35] shadow-lg shadow-black/10 backdrop-blur active:scale-95"
              aria-label="Go back"
            >
              <BackIcon />
            </button>

            <button
              type="button"
              onClick={
                handleToggleFavorite
              }
              className={`flex h-10 w-10 items-center justify-center rounded-full border border-[#BDEFE6] bg-white/90 shadow-lg shadow-black/10 backdrop-blur active:scale-95 ${
                liked
                  ? "text-red-500"
                  : "text-[#073B35]"
              }`}
              aria-label={
                liked
                  ? "Remove from favorites"
                  : "Save dish"
              }
            >
              <HeartIcon
                filled={liked}
              />
            </button>
          </div>

          <div className="h-[295px] w-full overflow-hidden">
            {food.image ? (
              <img
                src={food.image}
                alt={food.name}
                className={`h-full w-full object-cover ${
                  kitchenIsClosed ||
                  fulfillmentUnavailable
                    ? "grayscale opacity-60"
                    : ""
                }`}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-6xl">
                🍽️
              </div>
            )}
          </div>

          {isBlocked ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 px-5 text-center">
              <div className="rounded-3xl border border-[#BDEFE6] bg-white/95 px-5 py-4 shadow-xl">
                <p className="text-lg font-black text-[#073B35]">
                  {
                    getMainButtonLabel()
                  }
                </p>

                <p className="mt-1 text-xs font-semibold text-[#51615D]">
                  Ordering is
                  temporarily
                  unavailable.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <section className="mt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-black leading-tight tracking-tight text-[#111827]">
                {food.name}
              </h1>

              <div className="mt-2 flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#BDEFE6] bg-[#41D3BD] text-[11px] font-black text-white">
                  {sellerAvatarUrl ? (
                    <img
                      src={
                        sellerAvatarUrl
                      }
                      alt={`${kitchenName} profile`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    kitchenName
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>

                <p className="truncate text-xs font-bold text-[#51615D]">
                  {kitchenName}
                </p>
              </div>
            </div>

            <div className="shrink-0 pt-1 text-right">
              {ratingCount > 0 ? (
                <>
                  <div className="flex items-center justify-end gap-1 text-sm font-black text-[#111827]">
                    <span className="text-[#F59E0B]">
                      ★
                    </span>

                    <span>
                      {ratingAverage.toFixed(
                        1
                      )}
                    </span>
                  </div>

                  <p className="mt-1 text-[10px] font-bold text-[#51615D]">
                    {ratingCount}{" "}
                    {ratingCount ===
                    1
                      ? "rating"
                      : "ratings"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-black text-[#073B35]">
                    New
                  </p>

                  <p className="mt-1 text-[10px] font-bold text-[#51615D]">
                    No ratings yet
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-2xl font-black text-[#111827]">
              ₹{food.price}
            </p>

            <span
              className={`rounded-full border px-3 py-1 text-[10px] font-black ${
                food.type ===
                "Non-Veg"
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-[#BDEFE6] bg-[#41D3BD]/15 text-[#073B35]"
              }`}
            >
              {getTypeLabel()}
            </span>
          </div>

          {food.description ? (
            <p className="mt-4 text-sm font-semibold leading-relaxed text-[#51615D]">
              {
                food.description
              }
            </p>
          ) : (
            <p className="mt-4 text-sm font-semibold leading-relaxed text-[#51615D]">
              Fresh homemade food
              prepared by{" "}
              {kitchenName}.
            </p>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <InfoCard
              value={deliveryTime}
              label={
                deliveryAvailable
                  ? "Delivery time"
                  : pickupAvailable
                  ? "Pickup time"
                  : "Time"
              }
            />

            <InfoCard
              value={
                ratingCount > 0
                  ? `${ratingAverage.toFixed(
                      1
                    )} ★`
                  : "New"
              }
              label={
                ratingCount > 0
                  ? `${ratingCount} ${
                      ratingCount ===
                      1
                        ? "rating"
                        : "ratings"
                    }`
                  : "No ratings yet"
              }
            />
          </div>

          <div className="mt-4 rounded-[24px] border border-[#E8F4F1] bg-white/90 p-4 shadow-[6px_6px_16px_rgba(7,59,53,0.06),-6px_-6px_16px_rgba(255,255,255,0.95)]">
            <h2 className="text-base font-black text-[#111827]">
              About Kitchen
            </h2>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#51615D]">
              {food.seller_about ||
                `${kitchenName} serves fresh homemade food prepared with care.`}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {food.seller_specialty ? (
                <span className="rounded-full border border-[#BDEFE6] bg-[#41D3BD]/12 px-3 py-1.5 text-[10px] font-black text-[#073B35]">
                  {
                    food.seller_specialty
                  }
                </span>
              ) : null}

              {sellerDoorNo ? (
                <span className="rounded-full border border-[#E8F4F1] bg-[#FFFFF2] px-3 py-1.5 text-[10px] font-black text-[#073B35]">
                  Door No.{" "}
                  {sellerDoorNo}
                </span>
              ) : null}

              <span
                className={`rounded-full border px-3 py-1.5 text-[10px] font-black ${
                  kitchenIsClosed
                    ? "border-red-200 bg-red-50 text-red-600"
                    : "border-green-200 bg-green-50 text-green-700"
                }`}
              >
                {
                  getKitchenStatusText()
                }
              </span>
            </div>
          </div>

          <section className="mt-4 rounded-[24px] border border-[#BDEFE6] bg-white/95 p-4 shadow-[6px_6px_16px_rgba(7,59,53,0.06),-6px_-6px_16px_rgba(255,255,255,0.95)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black text-[#111827]">
                  Rate this dish
                </p>

                <p className="mt-1 text-xs font-semibold text-[#51615D]">
                  Ratings are
                  available after a
                  completed order
                  containing this
                  dish.
                </p>
              </div>

              {userRating > 0 ? (
                <span className="shrink-0 rounded-full border border-[#F3C06E] bg-[#FFF8E7] px-3 py-1 text-[10px] font-black text-[#B56B00]">
                  Your rating:{" "}
                  {userRating}/5
                </span>
              ) : null}
            </div>

            {ratingEligibilityLoading ? (
              <div className="mt-3 rounded-2xl border border-[#D8EAE6] bg-[#F7FCFA] p-3">
                <p className="text-xs font-black text-[#51615D]">
                  Checking rating
                  eligibility...
                </p>
              </div>
            ) : !canRateFood ? (
              <div className="mt-3 rounded-2xl border border-[#F3C06E] bg-[#FFF8E7] p-3">
                <p className="text-xs font-black text-[#8A5A00]">
                  {
                    ratingEligibilityMessage
                  }
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-2xl border border-[#BDEFE6] bg-[#F3FCFA] p-3">
                <p className="text-xs font-black text-[#0B8F80]">
                  Verified
                  purchase: you can
                  rate this dish.
                </p>
              </div>
            )}

            {ratingError ? (
              <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-black text-red-600">
                {ratingError}
              </p>
            ) : null}

            <div className="mt-4 flex items-center justify-between gap-2">
              {[1, 2, 3, 4, 5].map(
                (ratingValue) => {
                  const active =
                    ratingValue <=
                    userRating;

                  const disabled =
                    ratingSaving ||
                    ratingEligibilityLoading ||
                    !canRateFood;

                  return (
                    <button
                      key={
                        ratingValue
                      }
                      type="button"
                      onClick={() =>
                        submitRating(
                          ratingValue
                        )
                      }
                      disabled={
                        disabled
                      }
                      className={`flex h-11 flex-1 items-center justify-center rounded-2xl border text-2xl transition-all active:scale-95 disabled:cursor-not-allowed ${
                        disabled
                          ? "border-[#E2E9E7] bg-[#F7F7F4] text-[#C7D0CE] opacity-80"
                          : active
                          ? "border-[#F3C06E] bg-[#FFF8E7] text-[#F59E0B]"
                          : "border-[#D8EAE6] bg-[#FFFDF7] text-[#B9C7C4]"
                      }`}
                      aria-label={`Rate ${ratingValue} out of 5`}
                      aria-pressed={
                        active
                      }
                    >
                      {active
                        ? "★"
                        : "☆"}
                    </button>
                  );
                }
              )}
            </div>

            <p className="mt-3 text-center text-[10px] font-bold text-[#51615D]">
              {ratingEligibilityLoading
                ? "Checking your completed orders..."
                : !canRateFood
                ? "Complete an eligible order to unlock dish ratings."
                : ratingSaving
                ? "Saving your rating..."
                : userRating > 0
                ? "Tap another star to update your rating."
                : "Tap a star to submit your rating."}
            </p>
          </section>

          {getAvailabilityText() ? (
            <p
              className={`mt-3 text-xs font-black ${getAvailabilityClass()}`}
            >
              {
                getAvailabilityText()
              }
            </p>
          ) : null}
        </section>

        <section className="mt-7">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wide text-[#0B8F80]">
                More from kitchen
              </p>

              <h2 className="mt-1 truncate text-xl font-black text-[#111827]">
                {kitchenName} menu
              </h2>
            </div>

            <Link
              to={`/?q=${encodeURIComponent(
                kitchenName
              )}&search=1`}
              className="shrink-0 text-xs font-black text-[#0B8F80]"
            >
              See All
            </Link>
          </div>

          {kitchenFoods.length >
          0 ? (
            <div className="-mx-4 overflow-x-auto px-4 pb-2 scrollbar-hide">
              <div className="flex min-w-max gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedKitchenCategory(
                      "All"
                    )
                  }
                  className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-black ${
                    selectedKitchenCategory ===
                    "All"
                      ? "border-[#073B35] bg-[#073B35] text-white"
                      : "border-[#E8F4F1] bg-white/90 text-[#51615D]"
                  }`}
                >
                  All (
                  {kitchenCategoryCounts
                    .All || 0}
                  )
                </button>

                {KITCHEN_MENU_CATEGORIES.filter(
                  (categoryName) =>
                    kitchenCategoryCounts[
                      categoryName
                    ] > 0
                ).map(
                  (categoryName) => (
                    <button
                      key={
                        categoryName
                      }
                      type="button"
                      onClick={() =>
                        setSelectedKitchenCategory(
                          categoryName
                        )
                      }
                      className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-black ${
                        selectedKitchenCategory ===
                        categoryName
                          ? "border-[#073B35] bg-[#073B35] text-white"
                          : "border-[#E8F4F1] bg-white/90 text-[#51615D]"
                      }`}
                    >
                      {categoryName} (
                      {
                        kitchenCategoryCounts[
                          categoryName
                        ]
                      }
                      )
                    </button>
                  )
                )}
              </div>
            </div>
          ) : null}

          {kitchenFoods.length ===
          0 ? (
            <div className="rounded-[24px] border border-[#E8F4F1] bg-white/90 p-5 text-center shadow-[6px_6px_16px_rgba(7,59,53,0.06),-6px_-6px_16px_rgba(255,255,255,0.95)]">
              <div className="text-3xl">
                🍽️
              </div>

              <p className="mt-3 font-black text-[#111827]">
                No other dishes
                from this kitchen.
              </p>

              <p className="mt-1 text-sm font-semibold text-[#51615D]">
                Explore other nearby
                kitchens in the
                marketplace.
              </p>
            </div>
          ) : visibleKitchenFoods.length ===
            0 ? (
            <div className="rounded-[24px] border border-[#E8F4F1] bg-white/90 p-5 text-center shadow-sm">
              <p className="text-sm font-semibold text-[#51615D]">
                No dishes in this
                category right now.
              </p>
            </div>
          ) : (
            <>
              {availableKitchenFoods.length >
              0 ? (
                <p className="mb-3 text-xs font-bold text-[#51615D]">
                  {
                    availableKitchenFoods.length
                  }{" "}
                  available from this
                  kitchen.
                </p>
              ) : null}

              <div className="space-y-3">
                {visibleKitchenFoods.map(
                  (item) => (
                    <FoodCard
                      key={item.id}
                      item={item}
                    />
                  )
                )}
              </div>
            </>
          )}
        </section>
      </section>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E8F4F1] bg-[#FFFFF2]/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="flex h-14 shrink-0 items-center overflow-hidden rounded-2xl border border-[#E8F4F1] bg-white/90 shadow-[4px_4px_12px_rgba(7,59,53,0.06),-4px_-4px_12px_rgba(255,255,255,0.95)]">
            <button
              type="button"
              onClick={
                handleDecrease
              }
              disabled={
                quantity <= 0
              }
              className={`flex h-14 w-12 items-center justify-center text-xl font-black ${
                quantity <= 0
                  ? "cursor-not-allowed text-[#B8C9C5]"
                  : "text-[#073B35] active:bg-[#E8F4F1]"
              }`}
              aria-label="Decrease quantity"
            >
              −
            </button>

            <span className="flex h-14 min-w-10 items-center justify-center text-sm font-black text-[#073B35]">
              {quantity || 1}
            </span>

            <button
              type="button"
              onClick={
                quantity === 0
                  ? handleAddToCart
                  : handleIncrease
              }
              disabled={
                isBlocked ||
                quantity >= stock
              }
              className={`flex h-14 w-12 items-center justify-center text-xl font-black ${
                isBlocked ||
                quantity >= stock
                  ? "cursor-not-allowed text-[#B8C9C5]"
                  : "text-[#073B35] active:bg-[#E8F4F1]"
              }`}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          {quantity === 0 ||
          isBlocked ? (
            <button
              type="button"
              onClick={
                handleAddToCart
              }
              disabled={isBlocked}
              className={`h-14 flex-1 rounded-2xl border text-sm font-black transition-all active:scale-[0.98] ${
                isBlocked
                  ? "cursor-not-allowed border-red-100 bg-[#EAF7F4] text-[#8AA5A0]"
                  : "border-[#073B35] bg-[#073B35] text-white shadow-lg shadow-[#073B35]/15"
              }`}
            >
              <span className="block">
                {
                  getMainButtonLabel()
                }
              </span>

              {!isBlocked ? (
                <span className="block text-[10px] font-bold opacity-80">
                  ₹{food.price}
                </span>
              ) : null}
            </button>
          ) : (
            <Link
              to="/cart"
              className="flex h-14 flex-1 flex-col items-center justify-center rounded-2xl border border-[#073B35] bg-[#073B35] text-sm font-black text-white shadow-lg shadow-[#073B35]/15 active:scale-[0.98]"
            >
              <span>
                Go to Cart
              </span>

              <span className="text-[10px] font-bold opacity-80">
                {
                  computedCartCount
                }{" "}
                {computedCartCount ===
                1
                  ? "item"
                  : "items"}
              </span>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

function InfoCard({
  value,
  label,
}) {
  return (
    <div className="rounded-[20px] border border-[#E8F4F1] bg-white/90 p-4 text-center shadow-[5px_5px_14px_rgba(7,59,53,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]">
      <p className="text-sm font-black text-[#111827]">
        {value}
      </p>

      <p className="mt-1 text-[10px] font-bold text-[#51615D]">
        {label}
      </p>
    </div>
  );
}

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

function HeartIcon({
  filled,
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={
        filled
          ? "currentColor"
          : "none"
      }
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}