import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

const CART_TIMING_STORAGE_KEY = "Nefo_cart_order_timing";

function pad2(value) {
  return String(value).padStart(2, "0");
}

function toDateValue(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate()
  )}`;
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getStoredTiming() {
  try {
    const saved = localStorage.getItem(CART_TIMING_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function buildDateOptions() {
  const today = new Date();

  return Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(today, index);
    const value = toDateValue(date);

    const dayLabel =
      index === 0
        ? "Today"
        : index === 1
        ? "Tomorrow"
        : date.toLocaleDateString("en-IN", { weekday: "short" });

    const dateLabel = date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    return {
      value,
      label: `${dayLabel}, ${dateLabel}`,
    };
  });
}

function buildTimeOptions() {
  const slots = [];

  for (let hour = 7; hour <= 22; hour += 1) {
    ["00", "30"].forEach((minute) => {
      const value = `${pad2(hour)}:${minute}`;
      const date = new Date();
      date.setHours(hour, Number(minute), 0, 0);

      slots.push({
        value,
        label: date.toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      });
    });
  }

  return slots;
}

function getDefaultTimeValue(timeOptions) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const nextSlot = timeOptions.find((slot) => {
    const [hour, minute] = slot.value.split(":").map(Number);
    return hour * 60 + minute >= currentMinutes + 30;
  });

  return nextSlot?.value || "19:30";
}

export default function Cart() {
  const navigate = useNavigate();

  const {
    cartItems,
    cartTotal,
    increaseQuantity,
    decreaseQuantity,
    clearCart,
  } = useCart();

  const dateOptions = useMemo(() => buildDateOptions(), []);
  const timeOptions = useMemo(() => buildTimeOptions(), []);
  const storedTiming = useMemo(() => getStoredTiming(), []);

  const [orderTiming, setOrderTiming] = useState(
    storedTiming?.orderTiming || "now"
  );
  const [scheduledDate, setScheduledDate] = useState(
    storedTiming?.scheduledDate ||
      dateOptions[0]?.value ||
      toDateValue(new Date())
  );
  const [scheduledTime, setScheduledTime] = useState(
    storedTiming?.scheduledTime || getDefaultTimeValue(timeOptions)
  );
  const [errors, setErrors] = useState({});

  const finalTotal = cartTotal;

  const totalQuantity = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [cartItems]);

  const kitchenCount = useMemo(() => {
    return new Set(cartItems.map((item) => getKitchenName(item))).size;
  }, [cartItems]);

  const selectedDateLabel = useMemo(() => {
    return (
      dateOptions.find((option) => option.value === scheduledDate)?.label ||
      "Select date"
    );
  }, [dateOptions, scheduledDate]);

  const selectedTimeLabel = useMemo(() => {
    return (
      timeOptions.find((option) => option.value === scheduledTime)?.label ||
      "Select time"
    );
  }, [timeOptions, scheduledTime]);

  useEffect(() => {
    localStorage.setItem(
      CART_TIMING_STORAGE_KEY,
      JSON.stringify({
        orderTiming,
        scheduledDate,
        scheduledTime,
      })
    );
  }, [orderTiming, scheduledDate, scheduledTime]);

  function getKitchenName(item) {
    return item.seller_kitchen_name || item.seller || "Home Kitchen";
  }

  function handleCheckout() {
    const nextErrors = {};

    if (orderTiming === "scheduled") {
      if (!scheduledDate) {
        nextErrors.scheduledDate = "Please select a date.";
      }

      if (!scheduledTime) {
        nextErrors.scheduledTime = "Please select a time.";
      }
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    navigate("/checkout");
  }

  if (cartItems.length === 0) {
    return (
      <main className="min-h-screen bg-[#FFF8EC] px-4 py-5 pb-28 text-[#181411]">
        <div className="mx-auto max-w-md">
          <header className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                Cart
              </p>

              <h1 className="mt-1 text-3xl font-black tracking-tight text-[#3F5128]">
                Your Cart
              </h1>

              <p className="mt-1 text-sm font-bold text-[#6B6258]">
                No items added yet
              </p>
            </div>

            <Link
              to="/favorites"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#EADFCE] bg-white/90 text-[#CF743D] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)]"
              aria-label="Favorites"
            >
              <HeartIcon />
            </Link>
          </header>

          <section className="mt-6 rounded-[30px] border border-[#EADFCE] bg-white/90 p-8 text-center shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-4xl">
              🛒
            </div>

            <h2 className="mt-5 text-2xl font-black text-[#181411]">
              Your cart is empty
            </h2>

            <p className="mx-auto mt-2 max-w-xs text-sm font-semibold leading-relaxed text-[#6B6258]">
              Add fresh homemade food from nearby kitchens to continue.
            </p>

            <Link
              to="/marketplace"
              className="mt-6 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 text-center text-sm font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-[0.98]"
            >
              Explore Food
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8EC] px-4 py-5 pb-36 text-[#181411]">
      <div className="mx-auto max-w-md">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
              Cart
            </p>

            <h1 className="mt-1 text-3xl font-black tracking-tight text-[#3F5128]">
              Your Cart
            </h1>

            <p className="mt-1 text-sm font-bold text-[#6B6258]">
              {totalQuantity} {totalQuantity === 1 ? "item" : "items"} from{" "}
              {kitchenCount} {kitchenCount === 1 ? "kitchen" : "kitchens"}
            </p>
          </div>

          <Link
            to="/favorites"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[#EADFCE] bg-white/90 text-[#CF743D] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
            aria-label="Favorites"
          >
            <HeartIcon />
          </Link>
        </header>

        <section className="mt-5 overflow-hidden rounded-[30px] border border-[#EADFCE] bg-white/90 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]">
          <div className="divide-y divide-[#F1E8DC]">
            {cartItems.map((item) => {
              const kitchenName = getKitchenName(item);

              return (
                <article key={item.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/food/${item.id}`}
                      className="h-[64px] w-[64px] shrink-0 overflow-hidden rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF]"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl">
                          🍽️
                        </div>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link to={`/food/${item.id}`}>
                        <h2 className="truncate text-base font-black leading-tight text-[#181411]">
                          {item.name}
                        </h2>
                      </Link>

                      <p className="mt-1 truncate text-sm font-semibold text-[#6B6258]">
                        {kitchenName}
                      </p>

                      <p className="mt-1 text-sm font-black text-[#3F5128]">
                        ₹{item.price}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        onClick={() => decreaseQuantity(item.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#EADFCE] bg-[#FFFDF7] text-lg font-black text-[#3F5128] shadow-inner active:scale-95"
                        aria-label={`Decrease ${item.name}`}
                      >
                        −
                      </button>

                      <span className="min-w-4 text-center text-base font-black text-[#181411]">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => increaseQuantity(item.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[#EADFCE] bg-[#FFFDF7] text-lg font-black text-[#3F5128] shadow-inner active:scale-95"
                        aria-label={`Increase ${item.name}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="border-t border-[#F1E8DC] px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 text-sm font-black text-[#3F5128] active:scale-95"
              >
                <span className="text-lg leading-none">+</span>
                <span>Add more items</span>
              </Link>

              <button
                type="button"
                onClick={clearCart}
                className="text-sm font-black text-red-500 active:scale-95"
              >
                Clear
              </button>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
            Order Timing
          </p>

          <h2 className="mt-2 text-2xl font-black text-[#181411]">
            When should we prepare it?
          </h2>

          <div className="mt-5 space-y-4">
            <button
              type="button"
              onClick={() => {
                setOrderTiming("now");
                setErrors({});
              }}
              className={`w-full rounded-[24px] border p-5 text-left transition-all active:scale-[0.99] ${
                orderTiming === "now"
                  ? "border-[#CF743D] bg-[#FFF0DF] shadow-[5px_5px_14px_rgba(63,81,40,0.05),-5px_-5px_14px_rgba(255,255,255,0.95)]"
                  : "border-[#EADFCE] bg-white/90 shadow-[5px_5px_14px_rgba(63,81,40,0.05),-5px_-5px_14px_rgba(255,255,255,0.95)]"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${
                    orderTiming === "now"
                      ? "border-[#CF743D]/35 bg-white/80 text-[#CF743D]"
                      : "border-[#EADFCE] bg-[#FFFDF7] text-[#3F5128]"
                  }`}
                >
                  ⚡
                </div>

                <div className="min-w-0">
                  <p className="text-lg font-black text-[#181411]">
                    Order Now
                  </p>

                  <p className="mt-1 text-sm font-semibold text-[#6B6258]">
                    Place the order immediately.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setOrderTiming("scheduled");
                setErrors({});
              }}
              className={`w-full rounded-[24px] border p-5 text-left transition-all active:scale-[0.99] ${
                orderTiming === "scheduled"
                  ? "border-[#3F5128] bg-[#3F5128] text-white shadow-lg shadow-[#3F5128]/15"
                  : "border-[#EADFCE] bg-white/90 text-[#181411] shadow-[5px_5px_14px_rgba(63,81,40,0.05),-5px_-5px_14px_rgba(255,255,255,0.95)]"
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${
                    orderTiming === "scheduled"
                      ? "border-white/10 bg-white/15 text-white"
                      : "border-[#EADFCE] bg-[#FFFDF7] text-[#3F5128]"
                  }`}
                >
                  🕒
                </div>

                <div className="min-w-0">
                  <p
                    className={`text-lg font-black ${
                      orderTiming === "scheduled"
                        ? "text-white"
                        : "text-[#181411]"
                    }`}
                  >
                    Schedule Later
                  </p>

                  <p
                    className={`mt-1 text-sm font-semibold ${
                      orderTiming === "scheduled"
                        ? "text-white/75"
                        : "text-[#6B6258]"
                    }`}
                  >
                    {orderTiming === "scheduled"
                      ? `${selectedDateLabel} • ${selectedTimeLabel}`
                      : "Choose date and time."}
                  </p>
                </div>
              </div>
            </button>

            {orderTiming === "scheduled" ? (
              <div className="rounded-[24px] border border-[#EADFCE] bg-white/90 p-4 shadow-[5px_5px_14px_rgba(63,81,40,0.05),-5px_-5px_14px_rgba(255,255,255,0.95)]">
                <div>
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-[#CF743D]">
                    Date
                  </label>

                  {errors.scheduledDate ? (
                    <p className="mb-2 text-xs font-black text-red-500">
                      {errors.scheduledDate}
                    </p>
                  ) : null}

                  <div className="relative">
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6258]">
                      <CalendarIcon />
                    </div>

                    <select
                      value={scheduledDate}
                      onChange={(event) => {
                        setScheduledDate(event.target.value);
                        setErrors((current) => ({
                          ...current,
                          scheduledDate: "",
                        }));
                      }}
                      className="h-14 w-full appearance-none rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] py-0 pl-12 pr-12 text-sm font-black text-[#181411] outline-none focus:border-[#CF743D]"
                      aria-label="Select date"
                    >
                      {dateOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6258]">
                      <ChevronDownIcon />
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-2 block text-xs font-black uppercase tracking-wide text-[#CF743D]">
                    Time
                  </label>

                  {errors.scheduledTime ? (
                    <p className="mb-2 text-xs font-black text-red-500">
                      {errors.scheduledTime}
                    </p>
                  ) : null}

                  <div className="relative">
                    <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6B6258]">
                      <ClockIcon />
                    </div>

                    <select
                      value={scheduledTime}
                      onChange={(event) => {
                        setScheduledTime(event.target.value);
                        setErrors((current) => ({
                          ...current,
                          scheduledTime: "",
                        }));
                      }}
                      className="h-14 w-full appearance-none rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] py-0 pl-12 pr-12 text-sm font-black text-[#181411] outline-none focus:border-[#CF743D]"
                      aria-label="Select time"
                    >
                      {timeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6258]">
                      <ChevronDownIcon />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-[950] border-t border-[#EADFCE] bg-[#FFF8EC]/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="shrink-0 rounded-2xl border border-[#EADFCE] bg-white/90 px-4 py-3 text-left shadow-[4px_4px_12px_rgba(63,81,40,0.06),-4px_-4px_12px_rgba(255,255,255,0.95)]">
            <p className="text-[10px] font-black uppercase text-[#6B6258]">
              Total
            </p>

            <p className="text-xl font-black text-[#3F5128]">₹{finalTotal}</p>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            className="h-[58px] flex-1 rounded-2xl border border-[#3F5128] bg-[#3F5128] text-center text-sm font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-[0.98]"
          >
            Checkout • ₹{finalTotal}
          </button>
        </div>
      </div>
    </main>
  );
}

function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}