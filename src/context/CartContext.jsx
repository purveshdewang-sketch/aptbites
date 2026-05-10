import { createContext, useContext, useMemo, useState } from "react";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);

  // ADD ITEM TO CART
  function addToCart(item) {
    setCartItems((currentItems) => {
      // Ensure seller identity exists
      const incomingSellerId = item.user_id || item.seller_id;

      if (!incomingSellerId) {
        alert(
          "Seller information missing for this dish. Please refresh and try again."
        );

        return currentItems;
      }

      // Prevent mixed seller checkout
      if (currentItems.length > 0) {
        const existingSellerId =
          currentItems[0].user_id || currentItems[0].seller_id;

        if (existingSellerId !== incomingSellerId) {
          alert(
            "You can only order from one seller at a time."
          );

          return currentItems;
        }
      }

      const existingItem = currentItems.find(
        (cartItem) => cartItem.id === item.id
      );

      // Increase quantity if already exists
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

      // Add new item
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

  // INCREASE QUANTITY
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

  // DECREASE QUANTITY
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

  // REMOVE ITEM
  function removeFromCart(itemId) {
    setCartItems((currentItems) =>
      currentItems.filter((cartItem) => cartItem.id !== itemId)
    );
  }

  // CLEAR CART
  function clearCart() {
    setCartItems([]);
  }

  // TOTAL ITEMS
  const cartCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // TOTAL AMOUNT
  const cartTotal = cartItems.reduce(
    (total, item) =>
      total + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  // CURRENT SELLER
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