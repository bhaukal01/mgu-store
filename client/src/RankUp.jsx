import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import axios from "axios";

import StoreHeader from "./components/StoreHeader";
import ranksData from "./data/ranks.json";

import "./styles/ranks.css";

const ranks = ranksData.lifetimeRanks || [];
const currency = ranksData.currency || "INR";

const RankUp = () => {
  const navigate = useNavigate();

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  const [username, setUsername] = useState("");
  const [step, setStep] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [currentLifetimeRank, setCurrentLifetimeRank] = useState(null);
  const [subscriptionRank, setSubscriptionRank] = useState(null);

  const [selectedTargetCode, setSelectedTargetCode] = useState("");

  const currentRankObj = useMemo(() => {
    if (!currentLifetimeRank) return null;
    return ranks.find((r) => r.code === currentLifetimeRank) || null;
  }, [currentLifetimeRank]);

  const upgradeOptions = useMemo(() => {
    if (!currentRankObj) return [];
    const currentIdx = ranks.findIndex((r) => r.code === currentRankObj.code);
    if (currentIdx < 0) return [];

    return ranks.slice(currentIdx + 1).map((target) => {
      const cost = Math.max(
        1,
        Number(target.price) - Number(currentRankObj.price) - 1,
      );
      return {
        code: target.code,
        name: target.name,
        cost,
      };
    });
  }, [currentRankObj]);

  const closePopup = () => {
    setStep(null);
    setLoading(false);
    setError("");
    setCurrentLifetimeRank(null);
    setSubscriptionRank(null);
    setSelectedTargetCode("");
  };

  const isValidMcUsername = (value) => /^[A-Za-z0-9_]{3,16}$/.test(value);

  const start = () => {
    setError("");
    setStep("ask-username");
  };

  const checkRank = async () => {
    const u = username.trim();
    if (!isValidMcUsername(u)) {
      setError("Enter a valid Minecraft username (3-16, letters/numbers/_).");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(
        `${apiBaseUrl}/api/purchase/user-ranks`,
        {
          params: { username: u },
        },
      );

      const lifetime = data?.lifetimeRank || null;
      const sub = data?.subscriptionRank || null;

      setCurrentLifetimeRank(lifetime);
      setSubscriptionRank(sub);

      if (!lifetime && sub) {
        setStep("subscription-not-valid");
      } else if (!lifetime && !sub) {
        setStep("no-rank");
      } else {
        setStep("choose-upgrade");
      }
    } catch (e) {
      setError(e.response?.data?.error || "Failed to check rank. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const goToPayment = () => {
    const u = username.trim();
    if (!selectedTargetCode) {
      setError("Please select a rank to upgrade to.");
      return;
    }

    const selected = upgradeOptions.find((o) => o.code === selectedTargetCode);
    const quotedAmount = selected ? String(selected.cost) : "";

    navigate(
      `/buy?productCode=${encodeURIComponent(selectedTargetCode)}&username=${encodeURIComponent(u)}&mode=rankup${quotedAmount ? `&quoteAmount=${encodeURIComponent(quotedAmount)}` : ""}`,
    );
  };

  return (
    <div>
      <StoreHeader active="upgrades" />
      <div className="container mt-4">
        <h3 className="section-title">Rank Upgrades</h3>

        <div className="card p-4 text-center">
          <p className="mb-3">
            Click below, enter your username, and we’ll show valid upgrades.
          </p>
          <div className="d-flex justify-content-center">
            <button className="btn btn-buy" onClick={start}>
              Rank Up
            </button>
          </div>
        </div>
      </div>

      {step && (
        <div className="popup-overlay show">
          <div
            className="popup-content justify-content-between align-items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {step === "ask-username" && (
              <div className="w-100">
                <h3>Enter Username</h3>
                <p>
                  We’ll detect your current rank from your purchase history.
                </p>

                <input
                  type="text"
                  className="form-control text-center"
                  placeholder="Minecraft Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                />

                {error ? <p className="text-danger mt-3">{error}</p> : null}

                <div className="d-flex justify-content-between align-items-center mt-3">
                  <button
                    className="btn btn-buy"
                    onClick={checkRank}
                    disabled={loading}
                  >
                    {loading ? "Checking..." : "Continue"}
                  </button>
                  <button
                    className="btn btn-buy"
                    onClick={closePopup}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {step === "subscription-not-valid" && (
              <div className="w-100 text-center">
                <h3>Rank Up Not Available</h3>
                <p>
                  Subscription/Monthly ranks are not valid for rank upgrades.
                </p>
                <p>
                  Detected: <strong>{subscriptionRank}</strong>
                </p>
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <a className="btn btn-buy" href="/ranks">
                    Buy a Lifetime Rank
                  </a>
                  <button className="btn btn-buy" onClick={closePopup}>
                    Close
                  </button>
                </div>
              </div>
            )}

            {step === "no-rank" && (
              <div className="w-100 text-center">
                <h3>No Current Rank Found</h3>
                <p>
                  No lifetime rank purchase was detected for{" "}
                  <strong>{username.trim()}</strong>.
                </p>
                <p>Please buy a lifetime rank first.</p>
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <a className="btn btn-buy" href="/ranks">
                    Go to Ranks
                  </a>
                  <button className="btn btn-buy" onClick={closePopup}>
                    Close
                  </button>
                </div>
              </div>
            )}

            {step === "choose-upgrade" && (
              <div className="w-100">
                <h3>Select Upgrade</h3>
                <p>
                  Current Rank: <strong>{currentLifetimeRank}</strong>
                </p>

                {upgradeOptions.length === 0 ? (
                  <p>You already have the highest rank.</p>
                ) : (
                  <div className="text-start">
                    {upgradeOptions.map((opt) => (
                      <label
                        key={opt.code}
                        className="d-flex justify-content-between align-items-center border rounded p-2 mb-2"
                        style={{ cursor: "pointer" }}
                      >
                        <span>
                          <input
                            type="radio"
                            name="targetRank"
                            value={opt.code}
                            checked={selectedTargetCode === opt.code}
                            onChange={() => setSelectedTargetCode(opt.code)}
                            className="me-2"
                          />
                          {opt.name}
                        </span>
                        <span>
                          {currency === "INR" ? "₹" : currency} {opt.cost}
                        </span>
                      </label>
                    ))}
                    <p className="mt-2" style={{ opacity: 0.9 }}>
                      Final amount is calculated by the backend at payment time.
                    </p>
                  </div>
                )}

                {error ? <p className="text-danger mt-3">{error}</p> : null}

                <div className="d-flex justify-content-between align-items-center mt-3">
                  <button
                    className="btn btn-buy"
                    onClick={goToPayment}
                    disabled={!upgradeOptions.length}
                  >
                    Buy
                  </button>
                  <button className="btn btn-buy" onClick={closePopup}>
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RankUp;
