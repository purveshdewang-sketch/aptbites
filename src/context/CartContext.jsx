import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const CartContext = createContext(null);
const CART_STORAGE_KEY = "NeFo_cart_items";

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      const parsedCart = savedCart ? JSON.parse(savedCart) : [];

      if (!Array.isArray(parsedCart)) return [];

      return parsedCart
        .map((item) => ({
          ...item,
          quantity: Math.max(Number(item.quantity || 1), 1),
        }))
        .filter((item) => item?.id);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // Ignore localStorage write errors.
    }
  }, [cartItems]);

  function normalizeId(value) {
    if (value === null || value === undefined) return "";
    return String(value);
  }

  function getSellerId(item) {
    return item?.seller_id || item?.user_id || "";
  }

  function getItemStock(item) {
    const stock = Number(item?.stock ?? 999);
    return Number.isFinite(stock) ? stock : 999;
  }

  function getSafeQuantity(value) {
    const quantity = Number(value || 0);
    return Number.isFinite(quantity) ? quantity : 0;
  }

  function addToCart(item) {
    setCartItems((currentItems) => {
      const incomingSellerId = getSellerId(item);

      if (!incomingSellerId) {
        alert("Seller information missing. Please refresh and try again.");
        return currentItems;
      }

      if (getItemStock(item) <= 0) {
        alert("This item is sold out.");
        return currentItems;
      }

      if (currentItems.length > 0) {
        const existingSellerId = getSellerId(currentItems[0]);

        if (normalizeId(existingSellerId) !== normalizeId(incomingSellerId)) {
          alert("You can only order from one seller at a time.");
          return currentItems;
        }
      }

      const existingItem = currentItems.find(
        (cartItem) => normalizeId(cartItem.id) === normalizeId(item.id)
      );

      if (existingItem) {
        if (getSafeQuantity(existingItem.quantity) >= getItemStock(existingItem)) {
          alert("No more stock available for this item.");
          return currentItems;
        }

        return currentItems.map((cartItem) =>
          normalizeId(cartItem.id) === normalizeId(item.id)
            ? {
                ...cartItem,
                ...item,
                seller_id: incomingSellerId,
                quantity: getSafeQuantity(cartItem.quantity) + 1,
              }
            : cartItem
        );
      }

      return [
        ...currentItems,
        {
          ...item,
          seller_id: incomingSellerId,
          quantity: 1,
        },
      ];
    });
  }

  function increaseQuantity(itemId) {
    setCartItems((currentItems) =>
      currentItems.map((cartItem) => {
        if (normalizeId(cartItem.id) !== normalizeId(itemId)) return cartItem;

        if (getSafeQuantity(cartItem.quantity) >= getItemStock(cartItem)) {
          alert("No more stock available for this item.");
          return cartItem;
        }

        return {
          ...cartItem,
          quantity: getSafeQuantity(cartItem.quantity) + 1,
        };
      })
    );
  }

  function decreaseQuantity(itemId) {
    setCartItems((currentItems) =>
      currentItems
        .map((cartItem) =>
          normalizeId(cartItem.id) === normalizeId(itemId)
            ? {
                ...cartItem,
                quantity: getSafeQuantity(cartItem.quantity) - 1,
              }
            : cartItem
        )
        .filter((cartItem) => getSafeQuantity(cartItem.quantity) > 0)
    );
  }

  function removeFromCart(itemId) {
    setCartItems((currentItems) =>
      currentItems.filter(
        (cartItem) => normalizeId(cartItem.id) !== normalizeId(itemId)
      )
    );
  }

  function clearCart() {
    setCartItems([]);

    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // Ignore localStorage remove errors.
    }
  }

  const cartCount = cartItems.reduce(
    (total, item) => total + getSafeQuantity(item.quantity),
    0
  );

  const cartTotal = cartItems.reduce((total, item) => {
    return total + Number(item.price || 0) * getSafeQuantity(item.quantity);
  }, 0);

  const currentSellerId =
    cartItems.length > 0 ? getSellerId(cartItems[0]) || null : null;

  const value = useMemo(
    () => ({
      cartItems,
      cartCount,
      cartTotal,
      currentSellerId,
      addToCart,
      increaseQuantity,
      decreaseQuantity,
      removeFromCart,
      clearCart,
    }),
    [cartItems, cartCount, cartTotal, currentSellerId]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}