import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const {
    cartItems,
    cartTotal,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-yellow-400 font-semibold">Your Cart</p>
              <h1 className="text-5xl font-bold mt-2">Ready to order?</h1>
            </div>

            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="border border-red-500 text-red-400 hover:bg-red-500 hover:text-black px-5 py-3 rounded-2xl font-semibold transition-all duration-200"
              >
                Clear Cart
              </button>
            )}
          </div>

          {cartItems.length === 0 ? (
            <div className="mt-16 bg-[#111111] border border-[#2a2a2a] rounded-[2rem] p-10 text-center">
              <h2 className="text-3xl font-bold">Your cart is empty</h2>

              <p className="text-gray-500 mt-4">
                Add some delicious homemade food to continue.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-10 space-y-5">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#111111] border border-[#2a2a2a] rounded-3xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-5"
                  >
                    <div className="flex items-center gap-5">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-2xl"
                      />

                      <div>
                        <h2 className="text-2xl font-bold">{item.name}</h2>

                        <p className="text-gray-400 mt-1">
                          Homemade by {item.seller}
                        </p>

                        <p className="text-yellow-400 font-semibold mt-3">
                          ₹{item.price} per plate
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex items-center bg-black border border-[#333] rounded-2xl overflow-hidden w-fit">
                        <button
                          onClick={() => decreaseQuantity(item.id)}
                          className="px-4 py-2 text-yellow-400 hover:bg-[#1a1a1a] font-bold text-xl"
                        >
                          −
                        </button>

                        <span className="px-5 py-2 border-x border-[#333] font-bold">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() => increaseQuantity(item.id)}
                          className="px-4 py-2 text-yellow-400 hover:bg-[#1a1a1a] font-bold text-xl"
                        >
                          +
                        </button>
                      </div>

                      <p className="text-2xl font-bold text-white min-w-[90px]">
                        ₹{item.price * item.quantity}
                      </p>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="bg-red-500 hover:bg-red-400 text-black font-bold px-4 py-3 rounded-2xl"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-10 bg-[#111111] border border-[#2a2a2a] rounded-[2rem] p-8">
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-lg">Total Amount</p>

                  <h2 className="text-4xl font-bold text-yellow-400">
                    ₹{cartTotal}
                  </h2>
                </div>

                <Link
                  to="/checkout"
                  className="block text-center w-full mt-8 bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-4 rounded-2xl text-lg transition-all duration-200"
                >
                  Proceed to Checkout
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}