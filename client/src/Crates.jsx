import React from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import StoreHeader from "./components/StoreHeader";

const crates = [
  {
    name: "Soon",
    price: "9999",
    info: "Soon",
    img_src: "",
  },
];

const Crates = () => {
  const navigate = useNavigate();

  const handleBuy = (crate) => {
    navigate(`/buy?productCode=${encodeURIComponent(crate.name)}`);
  };
  return (
    <div>
      <StoreHeader active="crates" />
      <div className="container mt-4">
        <h3 className="section-title">Crates</h3>
        <div className="row">
          {crates.map((crate, index) => (
            <div className="col-md-6 mb-3" key={index}>
              <div className="card p-3 text-center position-relative">
                <h5>{crate.name}</h5>
                <p>₹{crate.price}</p>
                <div className="info-box">{crate.info}</div>
                <button
                  className="btn btn-buy"
                  onClick={() => handleBuy(crate)}
                >
                  Buy
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Crates;
