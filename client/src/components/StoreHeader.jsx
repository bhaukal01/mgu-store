import React from "react";

const StoreHeader = ({ active }) => {
  const linkClass = (key) =>
    `btn btn-custom mb-3${active === key ? " active" : ""}`;

  return (
    <div className="container d-flex justify-content-center align-items-center mt-5">
      <div className="row align-items-center w-100">
        <div className="col-12 col-md-6 d-flex justify-content-center">
          <a href="/">
            <img
              src="https://ik.imagekit.io/1usyzu9ab/MGU.png?updatedAt=1742319283271"
              alt="Logo"
              className="logo img-fluid"
            />
          </a>
        </div>
        <div className="col-12 col-md-6 d-flex flex-column align-items-center mt-4 mb-3">
          <a href="/ranks" className={linkClass("ranks")}>
            Ranks
          </a>
          <a href="/upgrades" className={linkClass("upgrades")}>
            Rank Upgrades
          </a>
          <a href="/crates" className={linkClass("crates")}>
            Crates
          </a>
        </div>
      </div>
    </div>
  );
};

export default StoreHeader;
