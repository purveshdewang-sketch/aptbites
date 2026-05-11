import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);
const CART_STORAGE_KEY = "quickbites_cart_items";

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  function getItemStock(item) {
    return Number(item.stock ?? 999);
  }

  function addToCart(item) {
    setCartItems((currentItems) => {
      const incomingSellerId = item.user_id || item.seller_id;

      if (!incomingSellerId) {
        alert("Seller information missing. Please refresh and try again.");
        return currentItems;
      }

      if (getItemStock(item) <= 0) {
        alert("This item is sold out.");
        return currentItems;
      }

      if (currentItems.length > 0) {
        const existingSellerId =
          currentItems[0].user_id || currentItems[0].seller_id;

        if (existingSellerId !== incomingSellerId) {
          alert("You can only order from one seller at a time.");
          return currentItems;
        }
      }

      const existingItem = currentItems.find(
        (cartItem) => cartItem.id === item.id
      );

      if (existingItem) {
        if (existingItem.quantity >= getItemStock(existingItem)) {
          alert("No more stock available for this item.");
          return currentItems;
        }

        return currentItems.map((cartItem) =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
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
        if (cartItem.id !== itemId) return cartItem;

        if (cartItem.quantity >= getItemStock(cartItem)) {
          alert("No more stock available for this item.");
          return cartItem;
        }

        return {
          ...cartItem,
          quantity: cartItem.quantity + 1,
        };
      })
    );
  }

  function decreaseQuantity(itemId) {
    setCartItems((currentItems) =>
      currentItems
        .map((cartItem) =>
          cartItem.id === itemId
            ? { ...cartItem, quantity: cartItem.quantity - 1 }
            : cartItem
        )
        .filter((cartItem) => cartItem.quantity > 0)
    );
  }

  function removeFromCart(itemId) {
    setCartItems((currentItems) =>
      currentItems.filter((cartItem) => cartItem.id !== itemId)
    );
  }

  function clearCart() {
    setCartItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }

  const cartCount = cartItems.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const cartTotal = cartItems.reduce(
    (total, item) =>
      total + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  const currentSellerId =
    cartItems.length > 0
      ? cartItems[0].seller_id || cartItems[0].user_id
      : null;

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

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}