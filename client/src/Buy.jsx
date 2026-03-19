import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { load } from "@cashfreepayments/cashfree-js";

import StoreHeader from "./components/StoreHeader";
import ranksData from "./data/ranks.json";

import "./styles/ranks.css";

const Buy = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const productCodeFromQuery = searchParams.get("productCode");
  const usernameFromQuery = searchParams.get("username");
  const quoteAmountFromQuery = searchParams.get("quoteAmount");
  const modeFromQuery = searchParams.get("mode");
  const legacyState = location.state || {};
  const productCode =
    productCodeFromQuery || legacyState.productCode || legacyState.packageName;

  const allRankProducts = [
    ...(ranksData.lifetimeRanks || []),
    ...(ranksData.subscriptionRanks || []),
  ];
  const displayProduct = allRankProducts.find((p) => p.code === productCode);
  const currency = ranksData.currency || "INR";
  const isSubscription = (ranksData.subscriptionRanks || []).some(
    (p) => p.code === productCode,
  );

  const packageName =
    displayProduct?.name || legacyState.packageName || productCode;
  const packageImg = displayProduct?.img || legacyState.packageImg;
  const price = displayProduct?.price ?? legacyState.price;

  const fallbackAmount =
    quoteAmountFromQuery !== null && quoteAmountFromQuery !== ""
      ? Number(quoteAmountFromQuery)
      : price;

  const [username, setUsername] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [cashfree, setCashfree] = useState(null);
  const [serverAmount, setServerAmount] = useState(null);
  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  useEffect(() => {
    if (!productCode) {
      navigate("/ranks");
    }

    if (usernameFromQuery && !username) {
      setUsername(usernameFromQuery);
    }

    async function initializeSDK() {
      const mode = (
        import.meta.env.VITE_CASHFREE_MODE || "production"
      ).toLowerCase();
      const sdk = await load({
        mode: mode === "sandbox" ? "sandbox" : "production",
      });
      setCashfree(sdk);
    }
    initializeSDK();
  }, [productCode, navigate, usernameFromQuery, username]);

  const handlePayment = async () => {
    if (!username.trim()) {
      setErrorMessage("Please enter your Minecraft username.");
      return;
    }

    try {
      const { data } = await axios.post(`${apiBaseUrl}/api/purchase/buy`, {
        username,
        productCode,
        mode: modeFromQuery === "rankup" ? "rankup" : "buy",
      });

      if (data.amount !== undefined) setServerAmount(data.amount);

      if (data.paymentSessionId && data.orderId && cashfree) {
        cashfree
          .checkout({
            paymentSessionId: data.paymentSessionId,
            redirectTarget: "_modal", // Opens payment in a popup
          })
          .then(async (result) => {
            if (result.error) {
              console.error("Payment Error:", result.error);
              setErrorMessage("Payment failed. Please try again.");
            }
            if (result.paymentDetails) {
              console.log(
                "✅ Payment Success:",
                result.paymentDetails.paymentMessage,
              );
              // The backend verifies payment via Cashfree and then fulfills via the proxy plugin.
              navigate(`/success?orderId=${encodeURIComponent(data.orderId)}`);
            }
          });
      } else {
        setErrorMessage("Failed to initiate payment. Try again.");
      }
    } catch (error) {
      setErrorMessage(
        error.response?.data?.error || "Error processing request. Try again.",
      );
      console.error("Payment Error:", error.response?.data || error.message);
    }
  };

  return (
    <div>
      <StoreHeader />
      <div className="container mt-5 text-center">
        <h3 className="section-title">Checkout</h3>
        <div className="card p-4 text-center">
          <div className="justify-content-between align-items-center">
            <h5>Selected Package:</h5>
            <h3>{packageName || "No Package Selected"}</h3>
            {packageImg && (
              <img src={packageImg} alt="Package" className="img_main" />
            )}
            <p className="mt-3">
              <strong>Final Price:</strong>{" "}
              {currency === "INR" ? "₹" : currency}{" "}
              {serverAmount ?? fallbackAmount ?? 0}
              {isSubscription ? "/month" : null}
            </p>
          </div>

          <div className="mt-4">
            <label htmlFor="username" className="form-label">
              Enter In-Game Username:
            </label>
            <input
              type="text"
              id="username"
              className="form-control text-center"
              placeholder="Your Minecraft Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {errorMessage && <p className="text-danger mt-3">{errorMessage}</p>}

          <div className="d-flex justify-content-between align-items-center">
            <button className="btn btn-buy mt-3" onClick={handlePayment}>
              Proceed to Payment
            </button>
            <a href="/" className="btn btn-buy mt-3">
              Cancel
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Buy;
