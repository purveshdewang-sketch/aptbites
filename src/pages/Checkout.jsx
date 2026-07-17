import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { scheduleOrderReminders } from "../lib/nefoLocalNotifications";

const PLATFORM_FEE = 8;

const NeFo_UPI_ID =
  "cropglagroresearchan.62455967@hdfcbank";

const NeFo_PAYEE_NAME =
  "CROPG1 AGRO RESEARCH AND DEVELOPMENT PVT LTD";

const CHECKOUT_STORAGE_PREFIX =
  "NeFo_checkout_details";

const LEGACY_CHECKOUT_STORAGE_PREFIX =
  "Nefo_checkout_details";

const CART_TIMING_STORAGE_KEY =
  "NeFo_cart_order_timing";

const LEGACY_CART_TIMING_STORAGE_KEY =
  "Nefo_cart_order_timing";

const MINIMUM_SCHEDULE_NOTICE_MINUTES =
  30;

const CARD =
  "rounded-[26px] border border-[#D8C9B3] bg-white/95 shadow-[8px_8px_22px_rgba(63,81,40,0.08),-8px_-8px_22px_rgba(255,255,255,0.95)]";

const INPUT =
  "w-full rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] px-4 py-3.5 text-sm font-semibold text-[#181411] outline-none placeholder:text-[#9A8E80] focus:border-[#CF743D] focus:bg-white disabled:cursor-not-allowed disabled:bg-[#F1E8DC] disabled:text-[#6B6258]";

function pad2(value) {
  return String(value).padStart(
    2,
    "0"
  );
}

function formatMoney(value) {
  const amount = Number(
    value || 0
  );

  return amount.toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  );
}

function formatUpiAmount(value) {
  const amount = Number(value || 0);

  if (!Number.isFinite(amount)) {
    return "0.00";
  }

  return amount.toFixed(2);
}

function formatDateValue(date) {
  return `${date.getFullYear()}-${pad2(
    date.getMonth() + 1
  )}-${pad2(date.getDate())}`;
}

function addDays(date, days) {
  const nextDate = new Date(date);

  nextDate.setDate(
    nextDate.getDate() + days
  );

  return nextDate;
}

function buildDateOptions() {
  const today = new Date();

  return Array.from({
    length: 7,
  }).map((_, index) => {
    const date = addDays(
      today,
      index
    );

    return {
      value:
        formatDateValue(date),

      day:
        index === 0
          ? "Today"
          : index === 1
          ? "Tomorrow"
          : date.toLocaleDateString(
              "en-IN",
              {
                weekday: "short",
              }
            ),

      date:
        date.toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
          }
        ),

      fullLabel:
        date.toLocaleDateString(
          "en-IN",
          {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
          }
        ),
    };
  });
}

function buildTimeOptions() {
  const options = [];

  for (
    let hour = 7;
    hour <= 22;
    hour += 1
  ) {
    [0, 30].forEach(
      (minute) => {
        const value = `${pad2(
          hour
        )}:${pad2(minute)}`;

        const label = new Date(
          `2000-01-01T${value}:00`
        ).toLocaleTimeString(
          "en-IN",
          {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }
        );

        options.push({
          value,
          label,
        });
      }
    );
  }

  return options;
}

function getAvailableTimeOptions(
  timeOptions,
  selectedDate
) {
  if (!selectedDate) {
    return [];
  }

  const todayValue =
    formatDateValue(
      new Date()
    );

  if (
    selectedDate !== todayValue
  ) {
    return timeOptions;
  }

  const minimumTime =
    Date.now() +
    MINIMUM_SCHEDULE_NOTICE_MINUTES *
      60 *
      1000;

  return timeOptions.filter(
    (option) => {
      const slotDate = new Date(
        `${selectedDate}T${option.value}:00`
      );

      return (
        !Number.isNaN(
          slotDate.getTime()
        ) &&
        slotDate.getTime() >=
          minimumTime
      );
    }
  );
}

function formatScheduledDateTime(
  dateValue,
  timeValue
) {
  if (
    !dateValue ||
    !timeValue
  ) {
    return "";
  }

  const date = new Date(
    `${dateValue}T${timeValue}:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return date.toLocaleString(
    "en-IN",
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }
  );
}

function getSafePackingCharge(
  value
) {
  return Math.min(
    15,
    Math.max(
      5,
      Number(value || 5)
    )
  );
}

export default function Checkout() {
  const {
    cartItems,
    cartTotal,
    clearCart,
  } = useCart();

  const { user } = useAuth();

  const navigate = useNavigate();

  const paymentProofInputRef =
    useRef(null);

  const timeDropdownRef =
    useRef(null);

  const selectedTimeOptionRef =
    useRef(null);

  const [
    formData,
    setFormData,
  ] = useState({
    fullName: "",
    phone: "",
    flat: "",
    deliveryType:
      "Doorstep delivery",
    notes: "",
  });

  const [
    orderTiming,
    setOrderTiming,
  ] = useState("now");

  const [
    scheduledDate,
    setScheduledDate,
  ] = useState("");

  const [
    scheduledTime,
    setScheduledTime,
  ] = useState("");

  const [
    packingRequired,
    setPackingRequired,
  ] = useState(true);

  const [
    kitchenAcceptsScheduledOrders,
    setKitchenAcceptsScheduledOrders,
  ] = useState(false);

  const [
    deliveryAvailable,
    setDeliveryAvailable,
  ] = useState(true);

  const [
    pickupAvailable,
    setPickupAvailable,
  ] = useState(true);

  const [
    packingCharge,
    setPackingCharge,
  ] = useState(5);

  const [
    checkingKitchenSettings,
    setCheckingKitchenSettings,
  ] = useState(true);

  const [
    paymentReference,
    setPaymentReference,
  ] = useState("");

  const [
    paymentProofFile,
    setPaymentProofFile,
  ] = useState(null);

  const [
    paymentProofPreview,
    setPaymentProofPreview,
  ] = useState("");

  const [
    paymentMessage,
    setPaymentMessage,
  ] = useState("");

  const [
    showQr,
    setShowQr,
  ] = useState(false);

  const [
    showBillDetails,
    setShowBillDetails,
  ] = useState(false);

  const [
    showTimingEditor,
    setShowTimingEditor,
  ] = useState(false);

  const [
    showTimeDropdown,
    setShowTimeDropdown,
  ] = useState(false);

  const [
    showDeliveryEditor,
    setShowDeliveryEditor,
  ] = useState(false);

  const [
    showContactEditor,
    setShowContactEditor,
  ] = useState(false);

  const [
    showNotesEditor,
    setShowNotesEditor,
  ] = useState(false);

  const [
    errors,
    setErrors,
  ] = useState({});

  const [
    orderPlaced,
    setOrderPlaced,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(false);


  const dateOptions =
    useMemo(
      () => buildDateOptions(),
      []
    );

  const timeOptions =
    useMemo(
      () => buildTimeOptions(),
      []
    );

  const availableTimeOptions =
    useMemo(
      () =>
        getAvailableTimeOptions(
          timeOptions,
          scheduledDate
        ),
      [
        timeOptions,
        scheduledDate,
      ]
    );

  const selectedTimeLabel =
    useMemo(
      () =>
        availableTimeOptions.find(
          (option) =>
            option.value ===
            scheduledTime
        )?.label || "",
      [
        availableTimeOptions,
        scheduledTime,
      ]
    );

  const subtotalAmount =
    Number(cartTotal || 0);

  const sellerPackingCharge =
    getSafePackingCharge(
      packingCharge
    );

  const effectivePackingCharge =
    packingRequired
      ? sellerPackingCharge
      : 0;

  const deliveryFee = 0;

  const totalAmount =
    subtotalAmount +
    effectivePackingCharge +
    PLATFORM_FEE +
    deliveryFee;

  const paymentMethod = "upi";

  const formattedSchedule =
    formatScheduledDateTime(
      scheduledDate,
      scheduledTime
    );

  const checkoutBlocked =
    cartItems.length > 0 &&
    !checkingKitchenSettings &&
    !deliveryAvailable &&
    !pickupAvailable;

  const totalQuantity =
    useMemo(() => {
      return cartItems.reduce(
        (total, item) =>
          total +
          Number(
            item.quantity || 0
          ),
        0
      );
    }, [cartItems]);

  const kitchenName =
    useMemo(() => {
      const firstItem =
        cartItems[0];

      return firstItem
        ? getKitchenName(
            firstItem
          )
        : "Home Kitchen";
    }, [cartItems]);

  const upiPaymentLink =
    `upi://pay?pa=${encodeURIComponent(
      NeFo_UPI_ID
    )}&pn=${encodeURIComponent(
      NeFo_PAYEE_NAME
    )}&am=${encodeURIComponent(
      formatUpiAmount(totalAmount)
    )}&cu=INR&tn=${encodeURIComponent(
      `NeFo food order ₹${formatUpiAmount(totalAmount)}`
    )}`;

  const qrCodeUrl =
    `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
      upiPaymentLink
    )}`;

  const manualPaymentText =
    `Pay ₹${formatUpiAmount(totalAmount)} to ${NeFo_UPI_ID}`;


  function getCheckoutStorageKey() {
    return user
      ? `${CHECKOUT_STORAGE_PREFIX}_${user.id}`
      : `${CHECKOUT_STORAGE_PREFIX}_guest`;
  }

  function getLegacyCheckoutStorageKey() {
    return user
      ? `${LEGACY_CHECKOUT_STORAGE_PREFIX}_${user.id}`
      : `${LEGACY_CHECKOUT_STORAGE_PREFIX}_guest`;
  }

  useEffect(() => {
    async function loadSavedCheckoutDetails() {
      const storageKey =
        getCheckoutStorageKey();

      const legacyStorageKey =
        getLegacyCheckoutStorageKey();

      const savedDetails =
        localStorage.getItem(
          storageKey
        ) ||
        localStorage.getItem(
          legacyStorageKey
        );

      if (savedDetails) {
        try {
          const parsedDetails =
            JSON.parse(
              savedDetails
            );

          setFormData(
            (current) => ({
              ...current,

              fullName:
                parsedDetails.fullName ||
                "",

              flat:
                parsedDetails.flat ||
                "",

              deliveryType:
                parsedDetails.deliveryType ||
                "Doorstep delivery",

              notes:
                parsedDetails.notes ||
                "",
            })
          );

          setOrderTiming(
            parsedDetails.orderTiming ||
              "now"
          );

          setScheduledDate(
            parsedDetails.scheduledDate ||
              ""
          );

          setScheduledTime(
            parsedDetails.scheduledTime ||
              ""
          );

          setPaymentReference(
            parsedDetails.paymentReference ||
              ""
          );

          setPackingRequired(
            parsedDetails.packingRequired !==
              false
          );
        } catch {
          localStorage.removeItem(
            storageKey
          );

          localStorage.removeItem(
            legacyStorageKey
          );
        }
      }

      const cartTimingDetails =
        localStorage.getItem(
          CART_TIMING_STORAGE_KEY
        ) ||
        localStorage.getItem(
          LEGACY_CART_TIMING_STORAGE_KEY
        );

      if (cartTimingDetails) {
        try {
          const parsedTiming =
            JSON.parse(
              cartTimingDetails
            );

          setOrderTiming(
            parsedTiming.orderTiming ||
              "now"
          );

          setScheduledDate(
            parsedTiming.scheduledDate ||
              ""
          );

          setScheduledTime(
            parsedTiming.scheduledTime ||
              ""
          );
        } catch {
          localStorage.removeItem(
            CART_TIMING_STORAGE_KEY
          );

          localStorage.removeItem(
            LEGACY_CART_TIMING_STORAGE_KEY
          );
        }
      }

      if (!user) {
        return;
      }

      let profileData = null;

      const profileResult =
        await supabase
          .from("profiles")
          .select(
            "full_name, phone, flat, flat_no, apartment_name, block"
          )
          .eq("id", user.id)
          .maybeSingle();

      if (!profileResult.error) {
        profileData =
          profileResult.data;
      } else {
        const fallbackResult =
          await supabase
            .from("profiles")
            .select(
              "full_name, phone, flat"
            )
            .eq("id", user.id)
            .maybeSingle();

        profileData =
          fallbackResult.data;
      }

      const lockedPhone =
        profileData?.phone ||
        user?.phone ||
        user?.user_metadata
          ?.phone ||
        "";

      const savedAddress =
        profileData?.flat_no ||
        profileData?.flat ||
        [
          profileData?.block,
          profileData?.apartment_name,
        ]
          .filter(Boolean)
          .join(", ");

      setFormData(
        (current) => ({
          ...current,

          fullName:
            current.fullName ||
            profileData?.full_name ||
            user?.user_metadata
              ?.full_name ||
            "",

          phone: lockedPhone,

          flat:
            current.flat ||
            profileData?.flat ||
            savedAddress ||
            user?.user_metadata
              ?.flat ||
            "",
        })
      );
    }

    loadSavedCheckoutDetails();
  }, [user]);

  useEffect(() => {
    const detailsToSave = {
      fullName:
        formData.fullName,

      flat: formData.flat,

      deliveryType:
        formData.deliveryType,

      notes: formData.notes,

      orderTiming,

      scheduledDate,

      scheduledTime,

      paymentReference,

      packingRequired,
    };

    localStorage.setItem(
      getCheckoutStorageKey(),
      JSON.stringify(
        detailsToSave
      )
    );
  }, [
    formData.fullName,
    formData.flat,
    formData.deliveryType,
    formData.notes,
    orderTiming,
    scheduledDate,
    scheduledTime,
    paymentReference,
    packingRequired,
    user,
  ]);

  useEffect(() => {
    async function checkKitchenSettings() {
      const kitchenId =
        getKitchenIdFromCart();

      if (
        !kitchenId ||
        kitchenId ===
          "MIXED_KITCHENS"
      ) {
        setKitchenAcceptsScheduledOrders(
          false
        );

        setDeliveryAvailable(
          false
        );

        setPickupAvailable(
          false
        );

        setPackingCharge(5);

        setCheckingKitchenSettings(
          false
        );

        return;
      }

      setCheckingKitchenSettings(
        true
      );

      const settings =
        await fetchKitchenSettings(
          kitchenId
        );

      const nextScheduleAllowed =
        settings.accept_scheduled_orders ===
        true;

      const nextDeliveryAvailable =
        settings.delivery_available !==
        false;

      const nextPickupAvailable =
        settings.pickup_available !==
        false;

      const nextPackingCharge =
        getSafePackingCharge(
          settings.packing_charge
        );

      setKitchenAcceptsScheduledOrders(
        nextScheduleAllowed
      );

      setDeliveryAvailable(
        nextDeliveryAvailable
      );

      setPickupAvailable(
        nextPickupAvailable
      );

      setPackingCharge(
        nextPackingCharge
      );

      setCheckingKitchenSettings(
        false
      );

      if (
        !nextScheduleAllowed &&
        orderTiming ===
          "scheduled"
      ) {
        setOrderTiming("now");
        setScheduledDate("");
        setScheduledTime("");
      }

      setFormData(
        (current) => {
          if (
            !nextDeliveryAvailable &&
            !nextPickupAvailable
          ) {
            return current;
          }

          if (
            current.deliveryType ===
              "Doorstep delivery" &&
            !nextDeliveryAvailable &&
            nextPickupAvailable
          ) {
            return {
              ...current,

              deliveryType:
                "Self pickup",
            };
          }

          if (
            current.deliveryType ===
              "Self pickup" &&
            !nextPickupAvailable &&
            nextDeliveryAvailable
          ) {
            return {
              ...current,

              deliveryType:
                "Doorstep delivery",
            };
          }

          return current;
        }
      );
    }

    checkKitchenSettings();
  }, [
    cartItems,
    orderTiming,
  ]);

  useEffect(() => {
    if (
      orderTiming !==
      "scheduled"
    ) {
      return;
    }

    if (!scheduledDate) {
      const firstDate =
        dateOptions[0]?.value ||
        "";

      const firstAvailableTime =
        getAvailableTimeOptions(
          timeOptions,
          firstDate
        )[0]?.value || "";

      setScheduledDate(
        firstDate
      );

      setScheduledTime(
        firstAvailableTime
      );

      return;
    }

    const selectedTimeStillAvailable =
      availableTimeOptions.some(
        (option) =>
          option.value ===
          scheduledTime
      );

    if (
      !selectedTimeStillAvailable
    ) {
      setScheduledTime(
        availableTimeOptions[0]
          ?.value || ""
      );
    }
  }, [
    orderTiming,
    scheduledDate,
    scheduledTime,
    availableTimeOptions,
    dateOptions,
    timeOptions,
  ]);

  useEffect(() => {
    if (!showTimeDropdown) {
      return undefined;
    }

    function handleOutsideTap(event) {
      if (
        timeDropdownRef.current &&
        !timeDropdownRef.current.contains(
          event.target
        )
      ) {
        setShowTimeDropdown(false);
      }
    }

    function handleEscapeKey(event) {
      if (event.key === "Escape") {
        setShowTimeDropdown(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      handleOutsideTap
    );

    document.addEventListener(
      "keydown",
      handleEscapeKey
    );

    const frameId =
      window.requestAnimationFrame(
        () => {
          selectedTimeOptionRef.current?.scrollIntoView(
            {
              block: "nearest",
            }
          );
        }
      );

    return () => {
      window.cancelAnimationFrame(
        frameId
      );

      document.removeEventListener(
        "pointerdown",
        handleOutsideTap
      );

      document.removeEventListener(
        "keydown",
        handleEscapeKey
      );
    };
  }, [showTimeDropdown]);

  async function fetchKitchenSettings(
    kitchenId
  ) {
    if (
      !kitchenId ||
      kitchenId ===
        "MIXED_KITCHENS"
    ) {
      return {
        accept_scheduled_orders:
          false,

        delivery_available:
          false,

        pickup_available:
          false,

        packing_charge: 5,
      };
    }

    const { data, error } =
      await supabase
        .from("profiles")
        .select(
          "accept_scheduled_orders, delivery_available, pickup_available, packing_charge"
        )
        .eq("id", kitchenId)
        .maybeSingle();

    if (error) {
      return {
        accept_scheduled_orders:
          false,

        delivery_available:
          false,

        pickup_available:
          false,

        packing_charge: 5,
      };
    }

    return {
      accept_scheduled_orders:
        data?.accept_scheduled_orders ===
        true,

      delivery_available:
        data?.delivery_available !==
        false,

      pickup_available:
        data?.pickup_available !==
        false,

      packing_charge:
        getSafePackingCharge(
          data?.packing_charge
        ),
    };
  }

  function getKitchenIdFromCart() {
    if (!cartItems.length) {
      return null;
    }

    const kitchenIds =
      cartItems
        .map(
          (item) =>
            item.user_id ||
            item.seller_id
        )
        .filter(Boolean);

    const uniqueKitchenIds = [
      ...new Set(kitchenIds),
    ];

    if (
      uniqueKitchenIds.length ===
      0
    ) {
      return null;
    }

    if (
      uniqueKitchenIds.length >
      1
    ) {
      return "MIXED_KITCHENS";
    }

    return uniqueKitchenIds[0];
  }

  function getKitchenName(item) {
    return (
      item.seller_kitchen_name ||
      item.seller ||
      "Home Kitchen"
    );
  }

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    if (name === "phone") {
      return;
    }

    setFormData(
      (current) => ({
        ...current,
        [name]: value,
      })
    );

    setErrors(
      (current) => ({
        ...current,
        [name]: "",
      })
    );
  }

  function selectDeliveryType(
    deliveryType
  ) {
    if (
      deliveryType ===
        "Doorstep delivery" &&
      !deliveryAvailable
    ) {
      setErrors(
        (current) => ({
          ...current,

          deliveryType:
            "This kitchen is not offering delivery right now.",
        })
      );

      return;
    }

    if (
      deliveryType ===
        "Self pickup" &&
      !pickupAvailable
    ) {
      setErrors(
        (current) => ({
          ...current,

          deliveryType:
            "This kitchen is not offering self pickup right now.",
        })
      );

      return;
    }

    setFormData(
      (current) => ({
        ...current,
        deliveryType,
      })
    );

    setErrors(
      (current) => ({
        ...current,
        deliveryType: "",
      })
    );
  }

  function selectOrderTiming(
    nextTiming
  ) {
    if (
      nextTiming ===
      "scheduled"
    ) {
      if (
        checkingKitchenSettings
      ) {
        setErrors(
          (current) => ({
            ...current,

            timing:
              "Checking kitchen schedule availability. Please try again.",
          })
        );

        return;
      }

      if (
        !kitchenAcceptsScheduledOrders
      ) {
        setErrors(
          (current) => ({
            ...current,

            timing:
              "This kitchen is not accepting scheduled orders right now.",
          })
        );

        return;
      }

      if (!scheduledDate) {
        const firstDate =
          dateOptions[0]
            ?.value || "";

        const firstTime =
          getAvailableTimeOptions(
            timeOptions,
            firstDate
          )[0]?.value || "";

        setScheduledDate(
          firstDate
        );

        setScheduledTime(
          firstTime
        );
      }

      setShowTimingEditor(
        true
      );

      setShowTimeDropdown(
        false
      );
    } else {
      setShowTimingEditor(
        false
      );

      setShowTimeDropdown(
        false
      );
    }

    setOrderTiming(
      nextTiming
    );

    setErrors(
      (current) => ({
        ...current,
        timing: "",
      })
    );
  }

  function selectScheduleDate(
    nextDate
  ) {
    const nextTimes =
      getAvailableTimeOptions(
        timeOptions,
        nextDate
      );

    setScheduledDate(
      nextDate
    );

    setScheduledTime(
      nextTimes[0]?.value ||
        ""
    );

    setShowTimeDropdown(
      false
    );

    setErrors(
      (current) => ({
        ...current,

        scheduledDate: "",

        scheduledTime: "",

        timing: "",
      })
    );
  }

  function selectScheduleTime(
    nextTime
  ) {
    setScheduledTime(
      nextTime
    );

    setShowTimeDropdown(
      false
    );

    setErrors(
      (current) => ({
        ...current,

        scheduledTime: "",

        timing: "",
      })
    );
  }

  function getScheduledDateTime() {
    if (
      orderTiming !==
      "scheduled"
    ) {
      return null;
    }

    if (
      !scheduledDate ||
      !scheduledTime
    ) {
      throw new Error(
        "Please select schedule date and time."
      );
    }

    const scheduledDateTime =
      new Date(
        `${scheduledDate}T${scheduledTime}:00`
      );

    if (
      Number.isNaN(
        scheduledDateTime.getTime()
      )
    ) {
      throw new Error(
        "Invalid schedule date or time."
      );
    }

    if (
      scheduledDateTime.getTime() <=
      Date.now()
    ) {
      throw new Error(
        "Scheduled time must be in the future."
      );
    }

    return scheduledDateTime.toISOString();
  }

  async function copyToClipboard(
    value,
    label
  ) {
    try {
      await navigator.clipboard.writeText(
        String(value)
      );

      setPaymentMessage(
        `${label} copied.`
      );
    } catch {
      setPaymentMessage(
        `Could not copy ${label.toLowerCase()}.`
      );
    }

    window.setTimeout(() => {
      setPaymentMessage("");
    }, 1800);
  }

  function openUpiPayment() {
    setPaymentMessage(
      "Opening UPI app. If it does not open, use Copy UPI ID or Scan QR."
    );

    setShowQr(true);

    try {
      window.location.href = upiPaymentLink;
    } catch {
      setPaymentMessage(
        "Could not open UPI app. Copy the UPI ID and pay manually."
      );
    }
  }

  function handlePaymentProofChange(
    event
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setErrors(
        (current) => ({
          ...current,

          payment:
            "Please upload a JPG, PNG, or WEBP payment screenshot.",
        })
      );

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setErrors(
        (current) => ({
          ...current,

          payment:
            "Payment screenshot must be below 5 MB.",
        })
      );

      return;
    }

    if (
      paymentProofPreview
    ) {
      URL.revokeObjectURL(
        paymentProofPreview
      );
    }

    setPaymentProofFile(
      file
    );

    setPaymentProofPreview(
      URL.createObjectURL(file)
    );

    setPaymentMessage(
      "Payment screenshot selected."
    );

    setErrors(
      (current) => ({
        ...current,
        payment: "",
      })
    );
  }

  function removePaymentProof() {
    if (
      paymentProofPreview
    ) {
      URL.revokeObjectURL(
        paymentProofPreview
      );
    }

    setPaymentProofFile(null);
    setPaymentProofPreview("");

    if (
      paymentProofInputRef.current
    ) {
      paymentProofInputRef.current.value =
        "";
    }
  }

  async function uploadPaymentProof() {
    if (
      !paymentProofFile ||
      !user
    ) {
      return "";
    }

    const fileExtension =
      paymentProofFile.name
        .split(".")
        .pop() || "jpg";

    const filePath =
      `${user.id}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${fileExtension}`;

    const { error } =
      await supabase.storage
        .from("payment-proofs")
        .upload(
          filePath,
          paymentProofFile,
          {
            cacheControl: "3600",
            upsert: false,
          }
        );

    if (error) {
      throw new Error(
        `Payment proof upload failed: ${error.message}`
      );
    }

    const { data } =
      supabase.storage
        .from("payment-proofs")
        .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function validateLiveStockBeforeOrder() {
    const foodIds =
      cartItems.map(
        (item) => item.id
      );

    const { data, error } =
      await supabase
        .from("foods")
        .select(
          "id, name, stock, user_id"
        )
        .in("id", foodIds);

    if (error) {
      throw new Error(
        error.message
      );
    }

    const latestFoodMap =
      new Map();

    (data || []).forEach(
      (foodItem) => {
        latestFoodMap.set(
          String(foodItem.id),
          foodItem
        );
      }
    );

    for (
      const cartItem of
      cartItems
    ) {
      const latestFood =
        latestFoodMap.get(
          String(cartItem.id)
        );

      if (!latestFood) {
        throw new Error(
          `${cartItem.name} is no longer available.`
        );
      }

      const liveStock =
        Number(
          latestFood.stock || 0
        );

      const requestedQuantity =
        Number(
          cartItem.quantity || 0
        );

      if (liveStock <= 0) {
        throw new Error(
          `${cartItem.name} is sold out.`
        );
      }

      if (
        requestedQuantity >
        liveStock
      ) {
        throw new Error(
          `${cartItem.name} has only ${liveStock} left. Please update your cart.`
        );
      }
    }
  }

  function validateCheckout() {
    const nextErrors = {};

    if (
      !formData.fullName.trim()
    ) {
      nextErrors.fullName =
        "Please enter the customer name.";
    }

    if (
      !formData.phone.trim()
    ) {
      nextErrors.phone =
        "A phone number is required in the profile.";
    }

    if (
      !formData.flat.trim()
    ) {
      nextErrors.flat =
        formData.deliveryType ===
        "Self pickup"
          ? "Please confirm your flat or apartment details."
          : "Please enter the complete delivery address.";
    }

    if (
      formData.deliveryType ===
        "Doorstep delivery" &&
      !deliveryAvailable
    ) {
      nextErrors.deliveryType =
        "Doorstep delivery is unavailable.";
    }

    if (
      formData.deliveryType ===
        "Self pickup" &&
      !pickupAvailable
    ) {
      nextErrors.deliveryType =
        "Self pickup is unavailable.";
    }

    if (
      orderTiming ===
      "scheduled"
    ) {
      if (!scheduledDate) {
        nextErrors.scheduledDate =
          "Please select a date.";
      }

      if (!scheduledTime) {
        nextErrors.scheduledTime =
          "Please select a time.";
      }
    }

    if (
      !paymentProofFile &&
      !paymentReference.trim()
    ) {
      nextErrors.payment =
        "Upload the completed UPI payment screenshot or enter the transaction reference.";
    }

    const cleanPaymentReference =
      paymentReference.trim();

    if (
      cleanPaymentReference &&
      !/^[A-Za-z0-9/-]{8,40}$/.test(cleanPaymentReference)
    ) {
      nextErrors.payment =
        "Enter a valid UPI transaction ID/reference from the completed payment screen.";
    }

    setErrors(nextErrors);

    if (
      Object.keys(
        nextErrors
      ).length > 0
    ) {
      if (
        nextErrors.fullName ||
        nextErrors.phone
      ) {
        setShowContactEditor(
          true
        );
      }

      if (
        nextErrors.flat ||
        nextErrors.deliveryType
      ) {
        setShowDeliveryEditor(
          true
        );
      }

      if (
        nextErrors.scheduledDate ||
        nextErrors.scheduledTime
      ) {
        setShowTimingEditor(
          true
        );
      }

      return false;
    }

    return true;
  }

  async function handlePlaceOrder() {
    if (!user) {
      navigate(
        "/customer-login"
      );

      return;
    }

    if (!validateCheckout()) {
      return;
    }

    if (!cartItems.length) {
      setErrors({
        general:
          "Your cart is empty.",
      });

      return;
    }

    const kitchenId =
      getKitchenIdFromCart();

    if (
      kitchenId ===
      "MIXED_KITCHENS"
    ) {
      setErrors({
        general:
          "Please order from one kitchen at a time.",
      });

      return;
    }

    if (!kitchenId) {
      setErrors({
        general:
          "Kitchen details are missing. Please add the dishes again.",
      });

      return;
    }

    setLoading(true);
    setPaymentMessage("");

    try {
      const latestKitchenSettings =
        await fetchKitchenSettings(
          kitchenId
        );

      const latestSellerPackingCharge =
        getSafePackingCharge(
          latestKitchenSettings
            .packing_charge
        );

      const latestEffectivePackingCharge =
        packingRequired
          ? latestSellerPackingCharge
          : 0;

      setPackingCharge(
        latestSellerPackingCharge
      );

      if (
        latestKitchenSettings
          .delivery_available ===
          false &&
        latestKitchenSettings
          .pickup_available ===
          false
      ) {
        setDeliveryAvailable(
          false
        );

        setPickupAvailable(
          false
        );

        throw new Error(
          "This kitchen is currently not accepting delivery or pickup orders."
        );
      }

      if (
        formData.deliveryType ===
          "Doorstep delivery" &&
        latestKitchenSettings
          .delivery_available ===
          false
      ) {
        setDeliveryAvailable(
          false
        );

        if (
          latestKitchenSettings
            .pickup_available
        ) {
          setPickupAvailable(
            true
          );

          setFormData(
            (current) => ({
              ...current,

              deliveryType:
                "Self pickup",
            })
          );
        }

        throw new Error(
          "This kitchen has turned off delivery. Please select self pickup."
        );
      }

      if (
        formData.deliveryType ===
          "Self pickup" &&
        latestKitchenSettings
          .pickup_available ===
          false
      ) {
        setPickupAvailable(
          false
        );

        if (
          latestKitchenSettings
            .delivery_available
        ) {
          setDeliveryAvailable(
            true
          );

          setFormData(
            (current) => ({
              ...current,

              deliveryType:
                "Doorstep delivery",
            })
          );
        }

        throw new Error(
          "This kitchen has turned off self pickup. Please select delivery."
        );
      }

      if (
        orderTiming ===
          "scheduled" &&
        latestKitchenSettings
          .accept_scheduled_orders !==
          true
      ) {
        setKitchenAcceptsScheduledOrders(
          false
        );

        setOrderTiming("now");
        setScheduledDate("");
        setScheduledTime("");

        throw new Error(
          "This kitchen is not accepting scheduled orders right now."
        );
      }

      const scheduledFor =
        getScheduledDateTime();

      await validateLiveStockBeforeOrder();

      const paymentProofUrl =
        await uploadPaymentProof();

      const latestTotalAmount =
        subtotalAmount +
        latestEffectivePackingCharge +
        PLATFORM_FEE +
        deliveryFee;

      const orderPayload = {
        user_id: user.id,

        seller_id: kitchenId,

        customer_name:
          formData.fullName.trim(),

        phone:
          formData.phone.trim(),

        flat:
          formData.flat.trim(),

        delivery_type:
          formData.deliveryType,

        notes:
          formData.notes.trim(),

        subtotal_amount:
          subtotalAmount,

        packing_required:
          packingRequired,

        packing_charge:
          latestEffectivePackingCharge,

        platform_fee:
          PLATFORM_FEE,

        delivery_fee:
          deliveryFee,

        total_amount:
          latestTotalAmount,

        status: "confirmed",

        items: cartItems,

        scheduled_order:
          orderTiming ===
          "scheduled",

        scheduled_for:
          scheduledFor,

        payment_method:
          paymentMethod,

        payment_status:
          paymentProofUrl
            ? "proof_submitted_pending_verification"
            : "reference_submitted_pending_verification",

        payment_reference:
          paymentReference.trim(),

        payment_proof_url:
          paymentProofUrl,
      };

      const {
        error: stockError,
      } = await supabase.rpc(
        "decrement_food_stock",
        {
          order_items:
            cartItems,
        }
      );

      if (stockError) {
        throw new Error(
          stockError.message
        );
      }

      const {
        data: createdOrder,
        error: orderError,
      } = await supabase
        .from("orders")
        .insert([
          orderPayload,
        ])
        .select(
          "id, scheduled_order, scheduled_for"
        )
        .single();

      if (orderError) {
        throw new Error(
          orderError.message
        );
      }

      if (
        createdOrder?.scheduled_order &&
        createdOrder?.scheduled_for
      ) {
        try {
          const reminderResult =
            await scheduleOrderReminders({
              orderId:
                createdOrder.id,
              scheduledFor:
                createdOrder.scheduled_for,
              audience:
                "customer",
              kitchenName,
            });

          if (
            reminderResult.scheduled ===
              0 &&
            reminderResult.reason
          ) {
            console.warn(
              "NeFo reminder was not scheduled:",
              reminderResult.reason
            );
          }
        } catch (
          notificationError
        ) {
          console.warn(
            "NeFo local notification setup failed:",
            notificationError
          );
        }
      }

      localStorage.setItem(
        getCheckoutStorageKey(),
        JSON.stringify({
          fullName:
            formData.fullName,

          flat:
            formData.flat,

          deliveryType:
            formData.deliveryType,

          notes: "",

          orderTiming,

          scheduledDate,

          scheduledTime,

          paymentReference:
            "",

          packingRequired,
        })
      );

      localStorage.removeItem(
        CART_TIMING_STORAGE_KEY
      );

      localStorage.removeItem(
        LEGACY_CART_TIMING_STORAGE_KEY
      );

      clearCart();

      setOrderPlaced(true);

      window.setTimeout(() => {
        navigate("/orders");
      }, 1500);
    } catch (error) {
      console.error(
        "ORDER PLACE ERROR:",
        error
      );

      const errorMessage =
        error?.message ||
        "Could not place order. Please try again.";

      setErrors(
        (current) => ({
          ...current,
          general:
            errorMessage,
        })
      );

      setPaymentMessage(
        `Could not place order: ${errorMessage}`
      );
    } finally {
      setLoading(false);
    }
  }

  if (orderPlaced) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FFF8EC] px-4 py-8 text-[#181411]">
        <div
          className={`w-full max-w-md p-7 text-center ${CARD}`}
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-4xl">
            🎉
          </div>

          <p className="mt-6 text-xs font-black uppercase tracking-wide text-[#CF743D]">
            {orderTiming ===
              "scheduled"
              ? "Order Scheduled"
              : "Order Confirmed"}
          </p>

          <h1 className="mt-3 text-3xl font-black leading-tight text-[#181411]">
            {orderTiming ===
              "scheduled"
              ? "Your order has been scheduled."
              : "Your food is now being prepared."}
          </h1>

          <p className="mt-4 text-sm font-semibold leading-relaxed text-[#6B6258]">
            Redirecting you to
            live order tracking.
          </p>

          <Link
            to="/orders"
            className="mt-7 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 font-black text-white active:scale-95"
          >
            Track My Order
          </Link>
        </div>
      </main>
    );
  }

  if (
    cartItems.length === 0
  ) {
    return (
      <main className="min-h-screen bg-[#FFF8EC] px-4 py-5 pb-28 text-[#181411]">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D8C9B3] bg-white/95 text-[#3F5128] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)]"
            aria-label="Go back"
          >
            <BackIcon />
          </button>

          <section
            className={`mt-6 p-8 text-center ${CARD}`}
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[#D8C9B3] bg-[#FFF0DF] text-4xl">
              🛒
            </div>

            <h1 className="mt-5 text-2xl font-black text-[#181411]">
              Your cart is empty
            </h1>

            <p className="mt-2 text-sm font-semibold leading-relaxed text-[#6B6258]">
              Add dishes from the
              marketplace before
              checkout.
            </p>

            <Link
              to="/marketplace"
              className="mt-6 block rounded-2xl border border-[#3F5128] bg-[#3F5128] py-4 text-center text-sm font-black text-white"
            >
              Explore Marketplace
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8EC] px-4 py-4 pb-40 text-[#181411]">
      <div className="mx-auto max-w-md">
        <header className="flex items-start gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D8C9B3] bg-white/95 text-[#3F5128] shadow-[6px_6px_16px_rgba(63,81,40,0.08),-6px_-6px_16px_rgba(255,255,255,0.95)] active:scale-95"
            aria-label="Go back"
          >
            <BackIcon />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
              Checkout
            </p>

            <h1 className="mt-1 text-3xl font-black leading-tight text-[#3F5128]">
              Confirm your order
            </h1>

            <p className="mt-1 truncate text-sm font-semibold text-[#6B6258]">
              {kitchenName} •{" "}
              {totalQuantity}{" "}
              {totalQuantity === 1
                ? "item"
                : "items"}
            </p>
          </div>
        </header>

        {errors.general ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-black text-red-600">
            {errors.general}
          </p>
        ) : null}

        <section className="mt-5">
          <SectionHeading
            number="1"
            eyebrow="Final items"
            title="Review your food"
          />

          <div
            className={`mt-3 overflow-hidden ${CARD}`}
          >
            <div className="divide-y divide-[#EADFCE]">
              {cartItems.map(
                (item) => (
                  <article
                    key={item.id}
                    className="flex gap-3 p-4"
                  >
                    <Link
                      to={`/food/${item.id}`}
                      className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF]"
                    >
                      {item.image ? (
                        <img
                          src={
                            item.image
                          }
                          alt={
                            item.name
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl">
                          🍽️
                        </div>
                      )}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-[#181411]">
                        {item.name}
                      </p>

                      <p className="mt-1 truncate text-xs font-semibold text-[#6B6258]">
                        {getKitchenName(
                          item
                        )}
                      </p>

                      <p className="mt-2 text-xs font-bold text-[#6B6258]">
                        Qty{" "}
                        {
                          item.quantity
                        }{" "}
                        × ₹
                        {formatMoney(
                          item.price
                        )}
                      </p>
                    </div>

                    <p className="shrink-0 text-sm font-black text-[#3F5128]">
                      ₹
                      {formatMoney(
                        Number(
                          item.price ||
                            0
                        ) *
                          Number(
                            item.quantity ||
                              0
                          )
                      )}
                    </p>
                  </article>
                )
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[#EADFCE] bg-[#FFFDF7] px-4 py-3">
              <Link
                to="/cart"
                className="text-xs font-black text-[#CF743D]"
              >
                Edit cart
              </Link>

              <p className="text-sm font-black text-[#3F5128]">
                Subtotal ₹
                {formatMoney(
                  subtotalAmount
                )}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-7">
          <SectionHeading
            number="2"
            eyebrow="Packaging"
            title="Choose packaging"
          />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() =>
                setPackingRequired(
                  true
                )
              }
              className={`rounded-[22px] border p-4 text-left transition-all active:scale-[0.98] ${
                packingRequired
                  ? "border-[#3F5128] bg-[#3F5128] text-white shadow-lg shadow-[#3F5128]/15"
                  : "border-[#D8C9B3] bg-white/95 text-[#181411]"
              }`}
            >
              <p className="text-sm font-black">
                Pack my order
              </p>

              <p
                className={`mt-1 text-xs font-semibold ${
                  packingRequired
                    ? "text-white/75"
                    : "text-[#6B6258]"
                }`}
              >
                Secure takeaway
                packing
              </p>

              <p className="mt-3 text-lg font-black">
                +₹
                {formatMoney(
                  sellerPackingCharge
                )}
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setPackingRequired(
                  false
                )
              }
              className={`rounded-[22px] border p-4 text-left transition-all active:scale-[0.98] ${
                !packingRequired
                  ? "border-[#CF743D] bg-[#FFF0DF] text-[#181411] shadow-md"
                  : "border-[#D8C9B3] bg-white/95 text-[#181411]"
              }`}
            >
              <p className="text-sm font-black">
                No extra packing
              </p>

              <p className="mt-1 text-xs font-semibold text-[#6B6258]">
                Choose only when
                suitable
              </p>

              <p className="mt-3 text-lg font-black text-[#3F5128]">
                ₹0
              </p>
            </button>
          </div>
        </section>

        <section className="mt-7">
          <SectionHeading
            number="3"
            eyebrow="Order timing"
            title="When should we prepare it?"
          />

          {errors.timing ? (
            <p className="mt-3 text-xs font-black text-red-600">
              {errors.timing}
            </p>
          ) : null}

          <div
            className={`mt-3 overflow-hidden ${CARD}`}
          >
            <button
              type="button"
              onClick={() =>
                selectOrderTiming(
                  "now"
                )
              }
              className="flex w-full items-center gap-3 border-b border-[#EADFCE] p-4 text-left"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
                  orderTiming ===
                  "now"
                    ? "border-[#CF743D] bg-[#FFF0DF] text-[#CF743D]"
                    : "border-[#D8C9B3] bg-[#FFFDF7] text-[#6B6258]"
                }`}
              >
                ⚡
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-black text-[#181411]">
                  Prepare now
                </p>

                <p className="mt-1 text-xs font-semibold text-[#6B6258]">
                  Estimated in
                  30–40 mins
                </p>
              </div>

              <RadioMark
                active={
                  orderTiming ===
                  "now"
                }
              />
            </button>

            <button
              type="button"
              onClick={() =>
                selectOrderTiming(
                  "scheduled"
                )
              }
              disabled={
                checkingKitchenSettings ||
                !kitchenAcceptsScheduledOrders
              }
              className="flex w-full items-center gap-3 p-4 text-left disabled:cursor-not-allowed disabled:opacity-55"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${
                  orderTiming ===
                  "scheduled"
                    ? "border-[#3F5128] bg-[#3F5128] text-white"
                    : "border-[#D8C9B3] bg-[#FFFDF7] text-[#6B6258]"
                }`}
              >
                🕒
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-black text-[#181411]">
                  Want this later?
                  Schedule it
                </p>

                <p className="mt-1 truncate text-xs font-semibold text-[#6B6258]">
                  {orderTiming ===
                    "scheduled" &&
                  formattedSchedule
                    ? formattedSchedule
                    : kitchenAcceptsScheduledOrders
                    ? "Choose a date and time"
                    : "Scheduling unavailable"}
                </p>
              </div>

              <RadioMark
                active={
                  orderTiming ===
                  "scheduled"
                }
              />
            </button>

            {orderTiming ===
              "scheduled" &&
            showTimingEditor ? (
              <div className="border-t border-[#EADFCE] bg-[#FFFDF7] p-4">
                <p className="text-[11px] font-black uppercase tracking-wide text-[#CF743D]">
                  Select date
                </p>

                {errors.scheduledDate ? (
                  <p className="mt-2 text-xs font-black text-red-600">
                    {
                      errors.scheduledDate
                    }
                  </p>
                ) : null}

                <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-hide">
                  {dateOptions.map(
                    (option) => {
                      const active =
                        option.value ===
                        scheduledDate;

                      return (
                        <button
                          key={
                            option.value
                          }
                          type="button"
                          onClick={() =>
                            selectScheduleDate(
                              option.value
                            )
                          }
                          className={`min-w-[96px] shrink-0 rounded-2xl border px-3 py-3 text-left active:scale-95 ${
                            active
                              ? "border-[#3F5128] bg-[#3F5128] text-white"
                              : "border-[#D8C9B3] bg-white text-[#3F5128]"
                          }`}
                        >
                          <p className="text-xs font-black">
                            {
                              option.day
                            }
                          </p>

                          <p
                            className={`mt-1 text-xs font-bold ${
                              active
                                ? "text-white/75"
                                : "text-[#6B6258]"
                            }`}
                          >
                            {
                              option.date
                            }
                          </p>
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="mt-3 block">
                  <span className="text-[11px] font-black uppercase tracking-wide text-[#CF743D]">
                    Select time
                  </span>

                  {errors.scheduledTime ? (
                    <span className="mt-2 block text-xs font-black text-red-600">
                      {
                        errors.scheduledTime
                      }
                    </span>
                  ) : null}

                  <div
                    ref={timeDropdownRef}
                    className="mt-3"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setShowTimeDropdown(
                          (current) =>
                            !current
                        )
                      }
                      disabled={
                        availableTimeOptions.length ===
                        0
                      }
                      aria-haspopup="listbox"
                      aria-expanded={
                        showTimeDropdown
                      }
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border bg-[#FFFDF7] px-4 py-3.5 text-left text-sm font-semibold outline-none transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#F1E8DC] ${
                        showTimeDropdown
                          ? "border-[#CF743D] bg-white"
                          : "border-[#D8C9B3]"
                      }`}
                    >
                      <span
                        className={
                          selectedTimeLabel
                            ? "text-[#181411]"
                            : "text-[#9A8E80]"
                        }
                      >
                        {selectedTimeLabel ||
                          "Select time"}
                      </span>

                      <DropdownChevronIcon
                        open={
                          showTimeDropdown
                        }
                      />
                    </button>

                    {availableTimeOptions.length ===
                    0 ? (
                      <p className="mt-2 rounded-xl border border-[#EADFCE] bg-white px-3 py-2 text-xs font-bold text-[#6B6258]">
                        No available time
                        slots for this
                        date.
                      </p>
                    ) : null}

                    {showTimeDropdown &&
                    availableTimeOptions.length >
                      0 ? (
                      <div
                        role="listbox"
                        aria-label="Available order times"
                        className="mt-2 max-h-64 overflow-y-auto overscroll-contain rounded-2xl border border-[#D8C9B3] bg-white p-1 shadow-[0_14px_34px_rgba(63,81,40,0.14)]"
                      >
                        {availableTimeOptions.map(
                          (option) => {
                            const active =
                              option.value ===
                              scheduledTime;

                            return (
                              <button
                                key={
                                  option.value
                                }
                                ref={
                                  active
                                    ? selectedTimeOptionRef
                                    : null
                                }
                                type="button"
                                role="option"
                                aria-selected={
                                  active
                                }
                                onClick={() =>
                                  selectScheduleTime(
                                    option.value
                                  )
                                }
                                className={`flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-black transition active:scale-[0.99] ${
                                  active
                                    ? "bg-[#3F5128] text-white"
                                    : "text-[#3F5128] hover:bg-[#FFF0DF]"
                                }`}
                              >
                                <span>
                                  {
                                    option.label
                                  }
                                </span>

                                {active ? (
                                  <span
                                    aria-hidden="true"
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-sm"
                                  >
                                    ✓
                                  </span>
                                ) : null}
                              </button>
                            );
                          }
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-7">
          <SectionHeading
            number="4"
            eyebrow="Confirmation"
            title="Delivery and total"
          />

          <div
            className={`mt-3 overflow-hidden ${CARD}`}
          >
            <ConfirmationRow
              icon="⚡"
              title={
                orderTiming ===
                "scheduled"
                  ? "Scheduled order"
                  : "Delivery in 30–40 mins"
              }
              subtitle={
                orderTiming ===
                "scheduled"
                  ? formattedSchedule ||
                    "Select a date and time"
                  : "Want this later? Use the schedule option above"
              }
              onClick={() => {
                if (
                  orderTiming ===
                  "scheduled"
                ) {
                  setShowTimingEditor(
                    (current) =>
                      !current
                  );
                }
              }}
              showChevron={
                orderTiming ===
                "scheduled"
              }
            />

            <ConfirmationRow
              icon={
                formData.deliveryType ===
                "Self pickup"
                  ? "🛍️"
                  : "📍"
              }
              title={
                formData.deliveryType ===
                "Self pickup"
                  ? "Pickup from kitchen"
                  : "Delivery at Home"
              }
              subtitle={
                formData.flat ||
                "Add delivery address"
              }
              onClick={() =>
                setShowDeliveryEditor(
                  (current) =>
                    !current
                )
              }
              error={
                errors.flat ||
                errors.deliveryType
              }
            />

            {showDeliveryEditor ? (
              <div className="border-b border-[#EADFCE] bg-[#FFFDF7] p-4">
                {errors.deliveryType ? (
                  <p className="mb-3 text-xs font-black text-red-600">
                    {
                      errors.deliveryType
                    }
                  </p>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      selectDeliveryType(
                        "Doorstep delivery"
                      )
                    }
                    disabled={
                      !deliveryAvailable
                    }
                    className={`rounded-2xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${
                      formData.deliveryType ===
                      "Doorstep delivery"
                        ? "border-[#3F5128] bg-[#3F5128] text-white"
                        : "border-[#D8C9B3] bg-white text-[#181411]"
                    }`}
                  >
                    <p className="text-sm font-black">
                      Delivery
                    </p>

                    <p className="mt-1 text-[10px] font-semibold opacity-75">
                      To your address
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      selectDeliveryType(
                        "Self pickup"
                      )
                    }
                    disabled={
                      !pickupAvailable
                    }
                    className={`rounded-2xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${
                      formData.deliveryType ===
                      "Self pickup"
                        ? "border-[#CF743D] bg-[#FFF0DF] text-[#181411]"
                        : "border-[#D8C9B3] bg-white text-[#181411]"
                    }`}
                  >
                    <p className="text-sm font-black">
                      Pickup
                    </p>

                    <p className="mt-1 text-[10px] font-semibold text-[#6B6258]">
                      Collect yourself
                    </p>
                  </button>
                </div>

                <label className="mt-4 block">
                  <span className="text-[11px] font-black uppercase tracking-wide text-[#6B6258]">
                    Address / flat
                    details
                  </span>

                  {errors.flat ? (
                    <span className="mt-2 block text-xs font-black text-red-600">
                      {errors.flat}
                    </span>
                  ) : null}

                  <textarea
                    name="flat"
                    value={
                      formData.flat
                    }
                    onChange={
                      handleChange
                    }
                    rows="3"
                    className={`${INPUT} mt-2 resize-none`}
                    placeholder="Flat, floor, block and apartment"
                  />
                </label>
              </div>
            ) : null}

            <ConfirmationRow
              icon="📝"
              title="Delivery instructions"
              subtitle={
                formData.notes ||
                "Add instructions for delivery partner"
              }
              onClick={() =>
                setShowNotesEditor(
                  (current) =>
                    !current
                )
              }
            />

            {showNotesEditor ? (
              <div className="border-b border-[#EADFCE] bg-[#FFFDF7] p-4">
                <textarea
                  name="notes"
                  value={
                    formData.notes
                  }
                  onChange={
                    handleChange
                  }
                  rows="3"
                  className={`${INPUT} resize-none`}
                  placeholder="Gate, landmark, call instructions or food note"
                />
              </div>
            ) : null}

            <ConfirmationRow
              icon="☎️"
              title={
                formData.fullName ||
                "Customer details"
              }
              subtitle={
                formData.phone ||
                "Add contact details"
              }
              onClick={() =>
                setShowContactEditor(
                  (current) =>
                    !current
                )
              }
              error={
                errors.fullName ||
                errors.phone
              }
            />

            {showContactEditor ? (
              <div className="border-b border-[#EADFCE] bg-[#FFFDF7] p-4">
                <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-wide text-[#6B6258]">
                    Customer name
                  </span>

                  {errors.fullName ? (
                    <span className="mt-2 block text-xs font-black text-red-600">
                      {
                        errors.fullName
                      }
                    </span>
                  ) : null}

                  <input
                    name="fullName"
                    value={
                      formData.fullName
                    }
                    onChange={
                      handleChange
                    }
                    className={`${INPUT} mt-2`}
                    placeholder="Full name"
                  />
                </label>

                <label className="mt-4 block">
                  <span className="text-[11px] font-black uppercase tracking-wide text-[#6B6258]">
                    Phone number
                  </span>

                  {errors.phone ? (
                    <span className="mt-2 block text-xs font-black text-red-600">
                      {errors.phone}
                    </span>
                  ) : null}

                  <input
                    name="phone"
                    value={
                      formData.phone
                    }
                    disabled
                    className={`${INPUT} mt-2`}
                    placeholder="Saved phone number"
                  />

                  <p className="mt-2 text-[10px] font-semibold text-[#6B6258]">
                    The phone number
                    is taken from your
                    NeFo profile.
                  </p>
                </label>
              </div>
            ) : null}

            <ConfirmationRow
              icon="🧾"
              title={`Total Bill ₹${formatMoney(
                totalAmount
              )}`}
              subtitle="Including packing and platform fee"
              onClick={() =>
                setShowBillDetails(
                  (current) =>
                    !current
                )
              }
            />

            {showBillDetails ? (
              <div className="space-y-3 border-t border-[#EADFCE] bg-[#FFFDF7] p-4">
                <BillRow
                  label="Food subtotal"
                  value={`₹${formatMoney(
                    subtotalAmount
                  )}`}
                />

                <BillRow
                  label="Packaging"
                  value={`₹${formatMoney(
                    effectivePackingCharge
                  )}`}
                />

                <BillRow
                  label="Platform fee"
                  value={`₹${formatMoney(
                    PLATFORM_FEE
                  )}`}
                />

                <BillRow
                  label="Delivery fee"
                  value={
                    deliveryFee === 0
                      ? "FREE"
                      : `₹${formatMoney(
                          deliveryFee
                        )}`
                  }
                  positive={
                    deliveryFee === 0
                  }
                />

                <div className="flex items-center justify-between border-t border-[#D8C9B3] pt-3">
                  <p className="font-black text-[#181411]">
                    Final total
                  </p>

                  <p className="text-lg font-black text-[#3F5128]">
                    ₹
                    {formatMoney(
                      totalAmount
                    )}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-7">
          <SectionHeading
            number="5"
            eyebrow="Payment"
            title="Pay securely by UPI"
          />

          <div
            className={`mt-3 p-4 ${CARD}`}
          >



            <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#D8C9B3] bg-[#FFF0DF] p-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                  Payable amount
                </p>

                <p className="mt-1 text-2xl font-black text-[#3F5128]">
                  ₹
                  {formatMoney(
                    totalAmount
                  )}
                </p>

                <p className="mt-1 truncate text-xs font-semibold text-[#6B6258]">
                  UPI ID:{" "}
                  {NeFo_UPI_ID}
                </p>

                <p className="mt-1 line-clamp-2 text-[10px] font-bold text-[#6B6258]">
                  Receiver: {NeFo_PAYEE_NAME}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    NeFo_UPI_ID,
                    "UPI ID"
                  )
                }
                className="shrink-0 rounded-xl border border-[#D8C9B3] bg-white px-3 py-2 text-xs font-black text-[#3F5128]"
              >
                Copy
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={openUpiPayment}
                className="flex h-12 items-center justify-center rounded-2xl border border-[#3F5128] bg-[#3F5128] text-sm font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-[0.98]"
              >
                Pay via UPI App
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowQr(
                    (current) =>
                      !current
                  )
                }
                className="h-12 rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] text-sm font-black text-[#3F5128] active:scale-[0.98]"
              >
                {showQr
                  ? "Hide QR"
                  : "Scan QR"}
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-[#D8C9B3] bg-[#FFFDF7] p-4">
              <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                Manual UPI fallback
              </p>

              <p className="mt-2 text-sm font-black text-[#181411]">
                Pay exactly ₹{formatMoney(totalAmount)}
              </p>

              <p className="mt-1 break-all text-xs font-semibold text-[#6B6258]">
                To: {NeFo_UPI_ID}
              </p>

              <p className="mt-1 text-xs font-semibold text-[#6B6258]">
                Receiver should show: {NeFo_PAYEE_NAME}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      NeFo_UPI_ID,
                      "UPI ID"
                    )
                  }
                  className="rounded-xl border border-[#D8C9B3] bg-white py-3 text-xs font-black text-[#3F5128]"
                >
                  Copy UPI ID
                </button>

                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      manualPaymentText,
                      "Payment details"
                    )
                  }
                  className="rounded-xl border border-[#D8C9B3] bg-white py-3 text-xs font-black text-[#3F5128]"
                >
                  Copy Amount
                </button>
              </div>

              <p className="mt-3 text-[10px] font-semibold leading-relaxed text-[#6B6258]">
                If Pay via UPI App fails, open Google Pay / PhonePe manually,
                paste this HDFC UPI ID, enter the same amount, then upload only the
                Completed screenshot.
              </p>
            </div>

            {showQr ? (
              <div className="mt-4 rounded-[22px] border border-[#D8C9B3] bg-[#FFFDF7] p-4 text-center">
                <p className="text-xs font-black uppercase tracking-wide text-[#CF743D]">
                  Scan and pay
                </p>

                <div className="mx-auto mt-3 w-fit rounded-3xl border border-[#EADFCE] bg-white p-3">
                  <img
                    src={qrCodeUrl}
                    alt="NeFo UPI QR code"
                    className="h-48 w-48 object-contain"
                  />
                </div>

                <p className="mt-3 text-lg font-black text-[#3F5128]">
                  ₹
                  {formatMoney(
                    totalAmount
                  )}
                </p>
              </div>
            ) : null}

            {errors.payment ? (
              <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-black text-red-600">
                {errors.payment}
              </p>
            ) : null}

            <div className="mt-4">
              <input
                ref={
                  paymentProofInputRef
                }
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  handlePaymentProofChange
                }
                className="hidden"
              />

              <button
                type="button"
                onClick={() =>
                  paymentProofInputRef.current?.click()
                }
                className="w-full rounded-2xl border border-dashed border-[#CF743D] bg-[#FFF8EC] px-4 py-4 text-left active:scale-[0.99]"
              >
                <p className="text-sm font-black text-[#181411]">
                  Upload payment
                  screenshot
                </p>

                <p className="mt-1 text-xs font-semibold text-[#6B6258]">
                  Upload only a successful
                  / completed payment
                  screenshot. JPG, PNG
                  or WEBP up to 5 MB.
                </p>
              </button>

              {paymentProofPreview ? (
                <div className="mt-3 overflow-hidden rounded-2xl border border-[#D8C9B3] bg-white p-3">
                  <img
                    src={
                      paymentProofPreview
                    }
                    alt="Payment proof preview"
                    className="max-h-56 w-full rounded-xl object-contain"
                  />

                  <button
                    type="button"
                    onClick={
                      removePaymentProof
                    }
                    className="mt-3 w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-black text-red-600"
                  >
                    Remove screenshot
                  </button>
                </div>
              ) : null}
            </div>

            <label className="mt-4 block">
              <span className="text-[11px] font-black uppercase tracking-wide text-[#6B6258]">
                UPI transaction
                reference
              </span>

              <input
                value={
                  paymentReference
                }
                onChange={(
                  event
                ) => {
                  setPaymentReference(
                    event.target.value
                  );

                  setErrors(
                    (current) => ({
                      ...current,
                      payment: "",
                    })
                  );
                }}
                className={`${INPUT} mt-2`}
                placeholder="Example: 619175270428"
              />

              <p className="mt-2 text-[10px] font-semibold leading-relaxed text-[#6B6258]">
                Do not submit failed, refunded, pending, or money-will-be-refunded screenshots.
              </p>
            </label>

            {paymentMessage ? (
              <p className="mt-3 text-xs font-black text-[#0B8F80]">
                {paymentMessage}
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-[950] border-t border-[#D8C9B3] bg-[#FFF8EC]/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <div className="min-w-0 shrink-0">
            <p className="text-[9px] font-black uppercase tracking-wide text-[#6B6258]">
              Pay using
            </p>

            <p className="mt-1 text-xs font-black text-[#3F5128]">
              UPI
            </p>
          </div>

          <div className="ml-auto min-w-[72px]">
            <p className="text-lg font-black leading-none text-[#181411]">
              ₹
              {formatMoney(
                totalAmount
              )}
            </p>

            <p className="mt-1 text-[9px] font-black uppercase text-[#6B6258]">
              Total
            </p>
          </div>

          <button
            type="button"
            onClick={
              handlePlaceOrder
            }
            disabled={
              loading ||
              checkoutBlocked
            }
            className="h-14 min-w-[142px] flex-1 rounded-2xl border border-[#3F5128] bg-[#3F5128] px-4 text-sm font-black text-white shadow-lg shadow-[#3F5128]/15 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Checking..."
              : checkoutBlocked
              ? "Unavailable"
              : orderTiming ===
                "scheduled"
              ? "Schedule Order"
              : "Place Order"}
          </button>
        </div>
      </div>
    </main>
  );
}

function SectionHeading({
  number,
  eyebrow,
  title,
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#3F5128] bg-[#3F5128] text-sm font-black text-white">
        {number}
      </div>

      <div>
        <p className="text-[10px] font-black uppercase tracking-wide text-[#CF743D]">
          {eyebrow}
        </p>

        <h2 className="mt-1 text-xl font-black text-[#181411]">
          {title}
        </h2>
      </div>
    </div>
  );
}

function ConfirmationRow({
  icon,
  title,
  subtitle,
  onClick,
  error = "",
  showChevron = true,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 border-b border-[#EADFCE] p-4 text-left last:border-b-0"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#EADFCE] bg-[#FFFDF7] text-lg">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-[#181411]">
          {title}
        </p>

        {error ? (
          <p className="mt-1 text-xs font-black text-red-600">
            {error}
          </p>
        ) : (
          <p className="mt-1 line-clamp-2 text-xs font-semibold leading-relaxed text-[#6B6258]">
            {subtitle}
          </p>
        )}
      </div>

      {showChevron ? (
        <ChevronRightIcon />
      ) : null}
    </button>
  );
}

function BillRow({
  label,
  value,
  positive = false,
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <p className="text-[#6B6258]">
        {label}
      </p>

      <p
        className={`font-black ${
          positive
            ? "text-green-700"
            : "text-[#181411]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function RadioMark({
  active,
}) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
        active
          ? "border-[#3F5128] bg-[#3F5128]"
          : "border-[#B7AA99] bg-white"
      }`}
    >
      {active ? (
        <span className="h-2 w-2 rounded-full bg-white" />
      ) : null}
    </span>
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

function DropdownChevronIcon({
  open,
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 shrink-0 text-[#6B6258] transition-transform ${
        open
          ? "rotate-180"
          : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mt-1 h-4 w-4 shrink-0 text-[#6B6258]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}