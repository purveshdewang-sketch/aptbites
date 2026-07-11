import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const CARD =
  "rounded-[28px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

function getFoodId(item) {
  return (
    item?.food_id ??
    item?.foodId ??
    item?.id ??
    null
  );
}

function getFoodKey(itemOrFoodId) {
  const foodId =
    typeof itemOrFoodId === "object"
      ? getFoodId(itemOrFoodId)
      : itemOrFoodId;

  if (
    foodId === null ||
    foodId === undefined ||
    foodId === ""
  ) {
    return "";
  }

  return String(foodId);
}

function getItemImage(item) {
  return (
    item?.image ||
    item?.image_url ||
    item?.food_image ||
    ""
  );
}

function buildRatingMap(
  rows,
  currentUserId
) {
  const nextMap = {};

  (rows || []).forEach((row) => {
    const foodKey = getFoodKey(
      row.food_id
    );

    const ratingValue = Number(
      row.rating || 0
    );

    if (
      !foodKey ||
      ratingValue < 1 ||
      ratingValue > 5
    ) {
      return;
    }

    if (!nextMap[foodKey]) {
      nextMap[foodKey] = {
        total: 0,
        count: 0,
        average: 0,
        userRating: 0,
      };
    }

    nextMap[foodKey].total +=
      ratingValue;

    nextMap[foodKey].count += 1;

    if (
      String(row.user_id) ===
      String(currentUserId)
    ) {
      nextMap[foodKey].userRating =
        ratingValue;
    }
  });

  Object.keys(nextMap).forEach(
    (foodKey) => {
      const ratingData =
        nextMap[foodKey];

      ratingData.average =
        ratingData.count > 0
          ? ratingData.total /
            ratingData.count
          : 0;
    }
  );

  return nextMap;
}

export default function OrderHistory() {
  const { user } = useAuth();

  const {
    addToCart,
    clearCart,
  } = useCart();

  const navigate = useNavigate();

  const [orders, setOrders] =
    useState([]);

  const [
    ratingsByFoodId,
    setRatingsByFoodId,
  ] = useState({});

  const [loading, setLoading] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    ratingLoadError,
    setRatingLoadError,
  ] = useState("");

  const [
    ratingErrors,
    setRatingErrors,
  ] = useState({});

  const [
    ratingSavingKey,
    setRatingSavingKey,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return undefined;
    }

    fetchCompletedOrders();

    const ordersChannel = supabase
      .channel(
        `customer-completed-orders-${user.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCompletedOrders(false);
        }
      )
      .subscribe();

    const ratingsChannel = supabase
      .channel(
        `customer-food-ratings-${user.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "food_ratings",
        },
        () => {
          fetchCompletedOrders(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(
        ordersChannel
      );

      supabase.removeChannel(
        ratingsChannel
      );
    };
  }, [user]);

  async function fetchCompletedOrders(
    showLoading = true
  ) {
    if (!user) return;

    if (showLoading) {
      setLoading(true);
    }

    setErrorMessage("");
    setRatingLoadError("");

    const {
      data,
      error,
    } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .in("status", [
        "completed",
        "delivered",
        "cancelled",
      ])
      .order("id", {
        ascending: false,
      });

    if (error) {
      setErrorMessage(error.message);
      setOrders([]);
      setRatingsByFoodId({});
      setLoading(false);
      return;
    }

    const nextOrders = data || [];

    setOrders(nextOrders);

    await fetchRatingsForOrders(
      nextOrders
    );

    setLoading(false);
  }

  async function fetchRatingsForOrders(
    orderRows
  ) {
    if (!user) return;

    const uniqueFoodIds =
      new Map();

    (orderRows || []).forEach(
      (order) => {
        const orderStatus =
          normalizeStatus(
            order.status
          );

        if (
          orderStatus !==
          "completed"
        ) {
          return;
        }

        getOrderItems(order).forEach(
          (item) => {
            const foodId =
              getFoodId(item);

            const foodKey =
              getFoodKey(foodId);

            if (
              foodKey &&
              !uniqueFoodIds.has(
                foodKey
              )
            ) {
              uniqueFoodIds.set(
                foodKey,
                foodId
              );
            }
          }
        );
      }
    );

    const foodIds = Array.from(
      uniqueFoodIds.values()
    );

    if (foodIds.length === 0) {
      setRatingsByFoodId({});
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from("food_ratings")
      .select(
        "food_id, user_id, rating"
      )
      .in("food_id", foodIds);

    if (error) {
      setRatingLoadError(
        `Ratings could not be loaded: ${error.message}`
      );

      setRatingsByFoodId({});
      return;
    }

    setRatingsByFoodId(
      buildRatingMap(
        data || [],
        user.id
      )
    );
  }

  function normalizeStatus(status) {
    const value = String(
      status || "completed"
    ).toLowerCase();

    if (value === "delivered") {
      return "completed";
    }

    return value;
  }

  function isSelfPickup(order) {
    return String(
      order.delivery_type || ""
    )
      .toLowerCase()
      .includes("pickup");
  }

  function getStatusLabel(order) {
    const currentStatus =
      normalizeStatus(order.status);

    if (
      currentStatus === "cancelled"
    ) {
      return "Cancelled";
    }

    return isSelfPickup(order)
      ? "Picked Up"
      : "Delivered";
  }

  function getStatusStyle(status) {
    const currentStatus =
      normalizeStatus(status);

    if (
      currentStatus === "cancelled"
    ) {
      return "border-red-200 bg-red-50 text-red-600";
    }

    return "border-green-200 bg-green-50 text-green-700";
  }

  function getOrderItems(order) {
    if (
      Array.isArray(order.items)
    ) {
      return order.items;
    }

    if (
      typeof order.items ===
      "string"
    ) {
      try {
        const parsedItems =
          JSON.parse(order.items);

        return Array.isArray(
          parsedItems
        )
          ? parsedItems
          : [];
      } catch {
        return [];
      }
    }

    return [];
  }

  function getOrderDate(order) {
    if (!order.created_at) {
      return "Date not available";
    }

    const date = new Date(
      order.created_at
    );

    if (
      Number.isNaN(date.getTime())
    ) {
      return "Date not available";
    }

    return date.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }
    );
  }

  function getShortOrderId(order) {
    const value = String(
      order.id || ""
    );

    return value.length > 8
      ? value
          .slice(0, 8)
          .toUpperCase()
      : value;
  }

  function getPaymentLabel(order) {
    const status = String(
      order.payment_status || ""
    ).replaceAll("_", " ");

    if (!status) {
      return "Payment submitted";
    }

    return (
      status.charAt(0).toUpperCase() +
      status.slice(1)
    );
  }

  async function submitRating(
    item,
    ratingValue
  ) {
    if (!user) return;

    const foodId =
      getFoodId(item);

    const foodKey =
      getFoodKey(foodId);

    if (!foodKey) {
      return;
    }

    if (
      ratingValue < 1 ||
      ratingValue > 5
    ) {
      return;
    }

    setRatingSavingKey(foodKey);

    setRatingErrors(
      (currentErrors) => ({
        ...currentErrors,
        [foodKey]: "",
      })
    );

    setSuccessMessage("");

    const {
      error,
    } = await supabase
      .from("food_ratings")
      .upsert(
        {
          food_id: foodId,
          user_id: user.id,
          rating: ratingValue,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            "food_id,user_id",
        }
      );

    if (error) {
      setRatingErrors(
        (currentErrors) => ({
          ...currentErrors,

          [foodKey]:
            `Rating could not be saved: ${error.message}`,
        })
      );

      setRatingSavingKey("");
      return;
    }

    setRatingsByFoodId(
      (currentRatings) => {
        const existing =
          currentRatings[foodKey] || {
            total: 0,
            count: 0,
            average: 0,
            userRating: 0,
          };

        const oldUserRating =
          Number(
            existing.userRating || 0
          );

        const nextCount =
          oldUserRating > 0
            ? existing.count
            : existing.count + 1;

        const nextTotal =
          existing.total -
          oldUserRating +
          ratingValue;

        return {
          ...currentRatings,

          [foodKey]: {
            total: nextTotal,
            count: nextCount,

            average:
              nextCount > 0
                ? nextTotal /
                  nextCount
                : 0,

            userRating:
              ratingValue,
          },
        };
      }
    );

    setSuccessMessage(
      `${item.name || "Dish"} rated ${ratingValue} out of 5.`
    );

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 1800);

    setRatingSavingKey("");

    await fetchRatingsForOrders(
      orders
    );
  }

  function handleReorder(order) {
    if (
      normalizeStatus(
        order.status
      ) === "cancelled"
    ) {
      alert(
        "Cancelled orders cannot be reordered directly."
      );

      return;
    }

    const orderItems =
      getOrderItems(order);

    if (
      orderItems.length === 0
    ) {
      alert(
        "This order has no items to reorder."
      );

      return;
    }

    clearCart();

    orderItems.forEach((item) => {
      const quantity = Number(
        item.quantity || 1
      );

      for (
        let index = 0;
        index < quantity;
        index += 1
      ) {
        addToCart({
          ...item,

          seller_id:
            order.seller_id,

          user_id:
            item.user_id ||
            order.seller_id,

          quantity: 1,
        });
      }
    });

    navigate("/cart");
  }

  const deliveredOrdersCount =
    useMemo(() => {
      return orders.filter(
        (order) =>
          normalizeStatus(
            order.status
          ) === "completed"
      ).length;
    }, [orders]);

  const cancelledOrdersCount =
    useMemo(() => {
      return orders.filter(
        (order) =>
          normalizeStatus(
            order.status
          ) === "cancelled"
      ).length;
    }, [orders]);

  const totalSpent = useMemo(() => {
    return orders
      .filter(
        (order) =>
          normalizeStatus(
            order.status
          ) === "completed"
      )
      .reduce(
        (total, order) =>
          total +
          Number(
            order.total_amount || 0
          ),
        0
      );
  }, [orders]);

  const rateableItemsCount =
    useMemo(() => {
      const uniqueFoodIds =
        new Set();

      orders.forEach((order) => {
        if (
          normalizeStatus(
            order.status
          ) !== "completed"
        ) {
          return;
        }

        getOrderItems(order).forEach(
          (item) => {
            const foodKey =
              getFoodKey(item);

            if (foodKey) {
              uniqueFoodIds.add(
                foodKey
              );
            }
          }
        );
      });

      return uniqueFoodIds.size;
    }, [orders]);

  const ratedItemsCount =
    useMemo(() => {
      return Object.values(
        ratingsByFoodId
      ).filter(
        (ratingData) =>
          Number(
            ratingData.userRating ||
              0
          ) > 0
      ).length;
    }, [ratingsByFoodId]);

  if (!user) {
    return (
      <main className="min-h-screen bg-[#FFF8EC] px-4 py-5 pb-28 text-[#181411]">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EADFCE] bg-white/90 text-[#3F5128] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)]"
            aria-label="Go back"
          >
            <BackIcon />
          </button>

          <section
            className={`mt-6 p-8 text-center ${CARD}`}
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-4xl">
              📜
            </div>

            <h1 className="mt-5 text-2xl font-black text-[#181411]">
              Sign in to view history
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Your completed, picked-up
              and cancelled orders will
              appear here.
            </p>

            <Link
              to="/customer-login"
              className="mt-6 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 text-center text-sm font-black text-white"
            >
              Sign In
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8EC] px-4 py-4 pb-32 text-[#181411]">
      <div className="mx-auto max-w-md">
        <header className="flex items-start gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#EADFCE] bg-white/90 text-[#3F5128] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
            aria-label="Go back"
          >
            <BackIcon />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
              Order History
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#3F5128]">
              Past orders

              <span className="block text-[#181411]">
                and ratings
              </span>
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Reorder previous meals
              and rate each completed
              dish.
            </p>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-3 gap-3">
          <StatTile
            label="Delivered"
            value={
              deliveredOrdersCount
            }
          />

          <StatTile
            label="Rated"
            value={`${ratedItemsCount}/${rateableItemsCount}`}
          />

          <StatTile
            label="Spent"
            value={`₹${totalSpent}`}
            strong
          />
        </section>

        {successMessage ? (
          <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-black text-green-700">
            {successMessage}
          </div>
        ) : null}

        {ratingLoadError ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-black text-red-600">
              Ratings could not load
            </p>

            <p className="mt-1 text-xs font-semibold text-red-500">
              {ratingLoadError}
            </p>
          </div>
        ) : null}

        {loading ? (
          <div className="mt-5 space-y-4">
            {[1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className={`animate-pulse p-5 ${CARD}`}
                >
                  <div className="h-5 w-1/3 rounded-full bg-[#EADFCE]" />

                  <div className="mt-4 h-4 w-2/3 rounded-full bg-[#EADFCE]" />

                  <div className="mt-5 h-32 rounded-2xl border border-[#EADFCE] bg-[#FFFDF7]" />
                </div>
              )
            )}
          </div>
        ) : null}

        {!loading &&
        errorMessage ? (
          <div className="mt-5 rounded-[28px] border border-red-200 bg-red-50 p-5">
            <p className="font-black text-red-600">
              Failed to load order
              history
            </p>

            <p className="mt-1 text-sm font-semibold text-red-500">
              {errorMessage}
            </p>

            <button
              type="button"
              onClick={() =>
                fetchCompletedOrders()
              }
              className="mt-4 rounded-2xl border border-red-600 bg-red-600 px-5 py-3 text-sm font-black text-white"
            >
              Try Again
            </button>
          </div>
        ) : null}

        {!loading &&
        !errorMessage &&
        orders.length === 0 ? (
          <section
            className={`mt-5 p-8 text-center ${CARD}`}
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-4xl">
              📜
            </div>

            <h2 className="mt-5 text-2xl font-black text-[#181411]">
              No order history yet
            </h2>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Completed and cancelled
              orders will appear here.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <Link
                to="/orders"
                className="rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 text-center text-sm font-black text-white active:scale-95"
              >
                View Active Orders
              </Link>

              <Link
                to="/marketplace"
                className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] py-4 text-center text-sm font-black text-[#3F5128] active:scale-95"
              >
                Explore Marketplace
              </Link>
            </div>
          </section>
        ) : null}

        {!loading &&
        !errorMessage &&
        orders.length > 0 ? (
          <section className="mt-5 space-y-4">
            {orders.map((order) => {
              const orderStatus =
                normalizeStatus(
                  order.status
                );

              const orderItems =
                getOrderItems(order);

              const isCancelled =
                orderStatus ===
                "cancelled";

              return (
                <article
                  key={order.id}
                  className={`overflow-hidden ${CARD}`}
                >
                  <div className="border-b border-[#EADFCE] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wide text-[#6B6258]">
                          Order #
                          {getShortOrderId(
                            order
                          )}
                        </p>

                        <h2 className="mt-1 text-3xl font-black text-[#3F5128]">
                          ₹
                          {order.total_amount ||
                            0}
                        </h2>

                        <p className="mt-1 truncate text-sm font-semibold text-[#6B6258]">
                          {order.delivery_type ||
                            "Delivery"}{" "}
                          •{" "}
                          {order.flat ||
                            "Address not available"}
                        </p>

                        <p className="mt-2 text-xs font-bold text-[#9A8E80]">
                          {getOrderDate(
                            order
                          )}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-black ${getStatusStyle(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(
                          order
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-black text-[#181411]">
                          Items
                        </p>

                        <p className="text-xs font-bold text-[#6B6258]">
                          {orderItems.length}{" "}
                          item
                          {orderItems.length ===
                          1
                            ? ""
                            : "s"}
                        </p>
                      </div>

                      {orderItems.length ===
                      0 ? (
                        <p className="text-sm font-semibold text-[#6B6258]">
                          No item details are
                          available for this
                          order.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {orderItems.map(
                            (
                              item,
                              itemIndex
                            ) => {
                              const foodId =
                                getFoodId(
                                  item
                                );

                              const foodKey =
                                getFoodKey(
                                  foodId
                                );

                              const ratingData =
                                ratingsByFoodId[
                                  foodKey
                                ] || {
                                  average: 0,
                                  count: 0,
                                  userRating: 0,
                                };

                              const itemImage =
                                getItemImage(
                                  item
                                );

                              const ratingError =
                                ratingErrors[
                                  foodKey
                                ] || "";

                              const isSaving =
                                ratingSavingKey ===
                                foodKey;

                              return (
                                <div
                                  key={`${order.id}-${
                                    foodKey ||
                                    item.name ||
                                    itemIndex
                                  }`}
                                  className="rounded-2xl border border-[#EADFCE] bg-white p-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <Link
                                      to={
                                        foodKey
                                          ? `/food/${foodId}`
                                          : "#"
                                      }
                                      onClick={(
                                        event
                                      ) => {
                                        if (
                                          !foodKey
                                        ) {
                                          event.preventDefault();
                                        }
                                      }}
                                      className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF]"
                                    >
                                      {itemImage ? (
                                        <img
                                          src={
                                            itemImage
                                          }
                                          alt={
                                            item.name ||
                                            "Food item"
                                          }
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <span className="text-2xl">
                                          🍽️
                                        </span>
                                      )}
                                    </Link>

                                    <div className="min-w-0 flex-1">
                                      {foodKey ? (
                                        <Link
                                          to={`/food/${foodId}`}
                                          className="block"
                                        >
                                          <p className="truncate text-sm font-black text-[#181411]">
                                            {item.name ||
                                              "Food item"}
                                          </p>
                                        </Link>
                                      ) : (
                                        <p className="truncate text-sm font-black text-[#181411]">
                                          {item.name ||
                                            "Food item"}
                                        </p>
                                      )}

                                      <p className="mt-0.5 text-xs font-semibold text-[#6B6258]">
                                        Qty{" "}
                                        {item.quantity ||
                                          1}{" "}
                                        × ₹
                                        {item.price ||
                                          0}
                                      </p>
                                    </div>

                                    <p className="shrink-0 text-sm font-black text-[#3F5128]">
                                      ₹
                                      {Number(
                                        item.price ||
                                          0
                                      ) *
                                        Number(
                                          item.quantity ||
                                            0
                                        )}
                                    </p>
                                  </div>

                                  {!isCancelled ? (
                                    foodKey ? (
                                      <div className="mt-3 rounded-2xl border border-[#F3C06E] bg-[#FFF8E7] p-3">
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                                              Rate this
                                              dish
                                            </p>

                                            <p className="mt-1 text-[11px] font-semibold text-[#6B6258]">
                                              {ratingData.userRating >
                                              0
                                                ? `Your rating: ${ratingData.userRating}/5`
                                                : "Tap a star to rate this completed purchase."}
                                            </p>
                                          </div>

                                          <div className="shrink-0 text-right">
                                            {ratingData.count >
                                            0 ? (
                                              <>
                                                <p className="text-sm font-black text-[#3F5128]">
                                                  {ratingData.average.toFixed(
                                                    1
                                                  )}{" "}
                                                  <span className="text-[#F59E0B]">
                                                    ★
                                                  </span>
                                                </p>

                                                <p className="text-[9px] font-bold text-[#6B6258]">
                                                  {
                                                    ratingData.count
                                                  }{" "}
                                                  {ratingData.count ===
                                                  1
                                                    ? "rating"
                                                    : "ratings"}
                                                </p>
                                              </>
                                            ) : (
                                              <p className="text-xs font-black text-[#3F5128]">
                                                New
                                              </p>
                                            )}
                                          </div>
                                        </div>

                                        {ratingError ? (
                                          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2 text-xs font-black text-red-600">
                                            {
                                              ratingError
                                            }
                                          </p>
                                        ) : null}

                                        <div className="mt-3 grid grid-cols-5 gap-2">
                                          {[
                                            1, 2, 3,
                                            4, 5,
                                          ].map(
                                            (
                                              ratingValue
                                            ) => {
                                              const active =
                                                ratingValue <=
                                                Number(
                                                  ratingData.userRating ||
                                                    0
                                                );

                                              return (
                                                <button
                                                  key={
                                                    ratingValue
                                                  }
                                                  type="button"
                                                  onClick={() =>
                                                    submitRating(
                                                      item,
                                                      ratingValue
                                                    )
                                                  }
                                                  disabled={
                                                    isSaving
                                                  }
                                                  className={`flex h-10 items-center justify-center rounded-xl border text-xl transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                                                    active
                                                      ? "border-[#F3C06E] bg-white text-[#F59E0B]"
                                                      : "border-[#EADFCE] bg-[#FFFDF7] text-[#C9BFB2]"
                                                  }`}
                                                  aria-label={`Rate ${
                                                    item.name ||
                                                    "this dish"
                                                  } ${ratingValue} out of 5`}
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

                                        <p className="mt-2 text-center text-[10px] font-bold text-[#6B6258]">
                                          {isSaving
                                            ? "Saving rating..."
                                            : ratingData.userRating >
                                              0
                                            ? "Tap another star to update your rating."
                                            : "Only completed purchases can be rated."}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="mt-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-3">
                                        <p className="text-xs font-black text-yellow-700">
                                          Rating unavailable
                                        </p>

                                        <p className="mt-1 text-[11px] font-semibold leading-relaxed text-yellow-700">
                                          This older
                                          order item does
                                          not contain its
                                          original food ID.
                                        </p>
                                      </div>
                                    )
                                  ) : null}
                                </div>
                              );
                            }
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 space-y-3 rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-4">
                      <SummaryRow
                        label="Subtotal"
                        value={`₹${
                          order.subtotal_amount ||
                          0
                        }`}
                      />

                      {order.packing_charge !==
                      undefined ? (
                        <SummaryRow
                          label="Packing"
                          value={`₹${
                            order.packing_charge ||
                            0
                          }`}
                        />
                      ) : null}

                      <SummaryRow
                        label="Platform Fee"
                        value={`₹${
                          order.platform_fee ||
                          0
                        }`}
                      />

                      <div className="flex items-center justify-between border-t border-[#EADFCE] pt-3">
                        <p className="font-black text-[#3F5128]">
                          Total
                        </p>

                        <p className="font-black text-[#3F5128]">
                          ₹
                          {order.total_amount ||
                            0}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-2xl border border-[#EADFCE] bg-white p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-[#6B6258]">
                        Payment
                      </p>

                      <p className="mt-1 text-sm font-black text-[#181411]">
                        {getPaymentLabel(
                          order
                        )}
                      </p>

                      {order.payment_reference ? (
                        <p className="mt-1 truncate text-xs font-semibold text-[#6B6258]">
                          Ref:{" "}
                          {
                            order.payment_reference
                          }
                        </p>
                      ) : null}
                    </div>

                    {order.scheduled_order &&
                    order.scheduled_for ? (
                      <div className="mt-3 rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF] p-4">
                        <p className="text-sm font-black text-[#3F5128]">
                          Scheduled order
                        </p>

                        <p className="mt-1 text-xs font-semibold text-[#6B6258]">
                          {new Date(
                            order.scheduled_for
                          ).toLocaleString(
                            "en-IN",
                            {
                              weekday:
                                "short",
                              day: "2-digit",
                              month:
                                "short",
                              hour:
                                "numeric",
                              minute:
                                "2-digit",
                              hour12:
                                true,
                            }
                          )}
                        </p>
                      </div>
                    ) : null}

                    {order.notes ? (
                      <p className="mt-3 rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-4 text-sm font-semibold text-[#6B6258]">
                        Note: {order.notes}
                      </p>
                    ) : null}

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {isCancelled ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 py-3 text-center text-xs font-black text-red-600">
                          Cancelled
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            handleReorder(
                              order
                            )
                          }
                          className="rounded-2xl border border-[#3F5128] bg-[#3F5128] py-3 text-xs font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-[0.98]"
                        >
                          Re-order
                        </button>
                      )}

                      <Link
                        to={`/order-chat/${order.id}`}
                        className="rounded-2xl border border-[#CF743D] bg-[#FFF0DF] py-3 text-center text-xs font-black text-[#3F5128] active:scale-[0.98]"
                      >
                        Chat
                      </Link>

                      <Link
                        to={`/customer-care?order_id=${order.id}`}
                        className="rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] py-3 text-center text-xs font-black text-[#3F5128] active:scale-[0.98]"
                      >
                        Help
                      </Link>
                    </div>

                    <p className="mt-4 text-xs leading-relaxed text-[#6B6258]">
                      Exact kitchen
                      door/location is not
                      shown publicly.
                      Pickup coordination
                      happens through NeFo
                      after confirmation.
                    </p>
                  </div>
                </article>
              );
            })}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function SummaryRow({
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <p className="text-[#6B6258]">
        {label}
      </p>

      <p className="font-bold text-[#181411]">
        {value}
      </p>
    </div>
  );
}

function StatTile({
  label,
  value,
  strong = false,
  muted = false,
}) {
  return (
    <div className="rounded-[22px] border border-[#EADFCE] bg-white/90 p-3 shadow-[5px_5px_14px_rgba(63,81,40,0.06),-5px_-5px_14px_rgba(255,255,255,0.95)]">
      <p className="text-[10px] font-black uppercase text-[#6B6258]">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-black ${
          muted
            ? "text-[#9A8E80]"
            : strong
            ? "text-[#3F5128]"
            : "text-[#181411]"
        }`}
      >
        {value}
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