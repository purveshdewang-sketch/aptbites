import Navbar from "../components/Navbar";

export default function Orders() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-8 sm:py-10">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div>
            <p className="text-yellow-400 font-semibold tracking-wide uppercase text-sm">
              Your Orders
            </p>

            <h1 className="text-4xl sm:text-5xl font-black mt-3 tracking-tight">
              Order History
            </h1>

            <p className="text-gray-400 mt-4 max-w-2xl leading-relaxed">
              Track all your previous homemade food orders from your apartment community.
            </p>
          </div>

          {/* Empty State */}
          <div className="mt-10 bg-[#111111] border border-[#222] rounded-[2rem] p-8 sm:p-10 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center text-4xl">
              🍲
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold mt-6">
              No orders yet
            </h2>

            <p className="text-gray-500 mt-3 max-w-md mx-auto">
              Once you place an order, your food history and order tracking
              will appear here.
            </p>

            <a
              href="/marketplace"
              className="inline-block mt-7 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black font-bold px-6 py-3 rounded-2xl transition-all duration-200"
            >
              Explore Marketplace
            </a>
          </div>

          {/* Future Orders Placeholder */}
          <div className="grid sm:grid-cols-2 gap-5 mt-8">
            <div className="bg-[#111111] border border-[#222] rounded-3xl p-6">
              <p className="text-yellow-400 font-semibold">
                Upcoming Feature
              </p>

              <h3 className="text-2xl font-bold mt-3">
                Live Order Tracking
              </h3>

              <p className="text-gray-500 mt-3 leading-relaxed">
                Customers will soon be able to track food preparation and pickup
                status in real time.
              </p>
            </div>

            <div className="bg-[#111111] border border-[#222] rounded-3xl p-6">
              <p className="text-yellow-400 font-semibold">
                Upcoming Feature
              </p>

              <h3 className="text-2xl font-bold mt-3">
                Repeat Orders
              </h3>

              <p className="text-gray-500 mt-3 leading-relaxed">
                Quickly reorder your favorite homemade dishes with one tap.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

