import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get("orderId");

  const apiBaseUrl = useMemo(
    () => import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
    [],
  );

  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 30; // ~60s

    const tick = async () => {
      attempts += 1;
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/purchase/status/${encodeURIComponent(orderId)}`,
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to fetch status");
        if (!cancelled) {
          setStatus(json.status);
          setError(null);
        }
        if (json.status === "completed" || attempts >= maxAttempts) return;
        setTimeout(tick, 2000);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to fetch status");
        if (attempts >= maxAttempts) return;
        setTimeout(tick, 3000);
      }
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, orderId]);

  return (
    <div className="container mt-5 text-center">
      <h3 className="section-title text-success">🎉 Payment Successful!</h3>
      <p>Thank you for your purchase! Your rank will be updated shortly.</p>

      {orderId && (
        <p>
          <strong>Order:</strong> {orderId}
        </p>
      )}

      {error && <p className="text-danger">{error}</p>}

      {orderId && (
        <p>
          <strong>Status:</strong> {status || "checking..."}
        </p>
      )}

      {!orderId && (
        <p>
          If your rank doesn’t update, please contact support with your payment
          reference.
        </p>
      )}

      <button className="btn btn-buy mt-3" onClick={() => navigate("/")}>
        Return to Store
      </button>
    </div>
  );
};

export default PaymentSuccess;
