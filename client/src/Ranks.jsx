import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import StoreHeader from "./components/StoreHeader";
import ranksData from "./data/ranks.json";

import "./styles/ranks.css";

const ranks = ranksData.lifetimeRanks || [];
const subscriptionRanks = ranksData.subscriptionRanks || [];
const currency = ranksData.currency || "INR";

const Ranks = () => {
  const navigate = useNavigate();
  const [popupRank, setPopupRank] = useState(null);

  const handleBuy = (rank) => {
    navigate(`/buy?productCode=${encodeURIComponent(rank.code)}`);
  };

  return (
    <div>
      <StoreHeader active="ranks" />

      <div className="container mt-4">
        <h3 className="section-title">Lifetime Ranks</h3>
        <div className="row">
          {ranks.map((rank, index) => (
            <div key={index} className="col-md-4 mb-3">
              <div className="card p-3 text-center position-relative">
                <img src={rank.img} alt={rank.name} />
                <h5>{rank.name}</h5>
                <p>
                  {currency === "INR" ? "₹" : currency} {rank.price}
                </p>
                {/* <div className="info-box">{rank.info}</div> */}
                <div className="d-flex justify-content-between align-items-center">
                  <button
                    className="btn btn-buy"
                    onClick={() => handleBuy(rank)}
                  >
                    Buy
                  </button>
                  <a onClick={() => setPopupRank(rank)}>
                    <img
                      className="infoimg"
                      src="https://img.icons8.com/?size=100&id=ytCVkHgJIqcg&format=png&color=FFFFFF"
                      alt="info"
                    />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        <h3 className="section-title mt-4">Subscription Ranks</h3>
        <div className="row">
          {subscriptionRanks.map((rank, index) => (
            <div key={index} className="col-md-4 mb-3">
              <div className="card p-3 text-center position-relative">
                <img src={rank.img} alt={rank.name} />
                <h5>{rank.name}</h5>
                <p>
                  {currency === "INR" ? "₹" : currency} {rank.price}/month
                </p>
                {/* <div className="info-box">{rank.info}</div> */}
                <div className="d-flex justify-content-between align-items-center">
                  <button
                    className="btn btn-buy"
                    onClick={() => handleBuy(rank)}
                  >
                    Buy
                  </button>
                  <a onClick={() => setPopupRank(rank)}>
                    <img
                      className="infoimg"
                      src="https://img.icons8.com/?size=100&id=ytCVkHgJIqcg&format=png&color=FFFFFF"
                      alt="info"
                    />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {popupRank && (
        <div className="popup-overlay show">
          <div
            className="popup-content justify-content-between align-items-center"
            onClick={() => setPopupRank(null)}
          >
            <img
              src={popupRank.img}
              alt={popupRank.name}
              className="popup-img"
            />
            <h3>{popupRank.name}</h3>
            <p>
              {currency === "INR" ? "₹" : currency} {popupRank.price}
            </p>
            {Array.isArray(popupRank.perks)
              ? popupRank.perks.map((item, index) => (
                  <p className="features" key={index}>
                    {item}
                  </p>
                ))
              : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default Ranks;
