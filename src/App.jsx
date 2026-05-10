import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import CustomerLogin from "./pages/CustomerLogin";
import SellerLogin from "./pages/SellerLogin";
import Marketplace from "./pages/Marketplace";
import SellerDashboard from "./pages/SellerDashboard";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import OrderHistory from "./pages/OrderHistory";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/customer-login"
          element={<CustomerLogin />}
        />

        <Route
          path="/seller-login"
          element={<SellerLogin />}
        />

        <Route
          path="/marketplace"
          element={<Marketplace />}
        />

        <Route
          path="/seller-dashboard"
          element={<SellerDashboard />}
        />

        <Route
          path="/cart"
          element={<Cart />}
        />

        <Route
          path="/checkout"
          element={<Checkout />}
        />

        {/* ACTIVE / LIVE ORDERS */}
        <Route
          path="/orders"
          element={<Orders />}
        />

        {/* COMPLETED ORDERS */}
        <Route
          path="/order-history"
          element={<OrderHistory />}
        />
      </Routes>
    </BrowserRouter>
  );
}