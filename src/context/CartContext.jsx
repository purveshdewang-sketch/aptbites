import { createContext, useContext, useMemo, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  // Add item to cart
  function addToCart(item) {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (cartItem) => cartItem.id === item.id
      );

      if (existingItem) {
        return currentItems.map((cartItem) =>
          cartItem.id === item.id
            ? {
                ...cartItem,
                quantity: cartItem.quantity + 1,
              }
            : cartItem
        );
      }

      return [...currentItems, { ...item, quantity: 1 }];
    });
  }

  // Increase quantity
  function increaseQuantity(itemId) {
    setCartItems((currentItems) =>
      currentItems.map((cartItem) =>
        cartItem.id === itemId
          ? {
              ...cartItem,
              quantity: cartItem.quantity + 1,
            }
          : cartItem
      )
    );
  }

  // Decrease quantity
  function decreaseQuantity(itemId) {
    setCartItems((currentItems) =>
      currentItems
        .map((cartItem) =>
          cartItem.id === itemId
            ? {
                ...cartItem,
                quantity: cartItem.quantity - 1,
              }
            : cartItem
        )
        .filter((cartItem) => cartItem.quantity > 0)
    );
  }

  // Remove item fully
  function removeFromCart(itemId) {
    setCartItems((currentItems) =>
      currentItems.filter((cartItem) => cartItem.id !== itemId)
    );
  }

  // Clear cart
  function clearCart() {
    setCartItems([]);
  }

  // Total items count
  const cartCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // Total amount
  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const value = useMemo(
    () => ({
      cartItems,
      cartCount,
      cartTotal,
      addToCart,
      increaseQuantity,
      decreaseQuantity,
      removeFromCart,
      clearCart,
    }),
    [cartItems, cartCount, cartTotal]
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