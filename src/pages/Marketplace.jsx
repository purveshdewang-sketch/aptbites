import { Navigate, useLocation } from "react-router-dom";

export default function Marketplace() {
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);

  searchParams.set("search", "1");

  const queryString = searchParams.toString();

  return (
    <Navigate
      to={`/${queryString ? `?${queryString}` : ""}`}
      replace
    />
  );
}