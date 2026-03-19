import React from "react";
import "./styles/index.css";
import "bootstrap/dist/css/bootstrap.min.css";

import StoreHeader from "./components/StoreHeader";

const Index = () => {
  return (
    <div>
      <StoreHeader />

      <div className="container mt-5">
        <div className="row">
          <div className="col-md-8">
            <div className="card p-3 mb-4">
              <h4>Rank Store</h4>
              <p>
                Welcome to the official MGU.ONE store. Here, you may purchase a
                variety of different in-game Rank Packages for MGU.ONE. We use
                UPI and Debit Cards Payments to securely process checkouts and
                do not store any customer information with us.
              </p>
              <p>
                All items should be delivered automatically to you in-game
                within 1-4 hours after purchase.
              </p>
              <a
                href="https://discord.mgu.one"
                target="_blank"
                className="btn btn-glow"
              >
                Discord Support
              </a>
            </div>

            <div className="card p-3">
              <h5>Need Help?</h5>
              <p>
                If you have any issues, please create a ticket in our Discord
                server or contact us via email.
              </p>
              <p>
                <strong>Email:</strong> support@mgu.one
              </p>
            </div>
            <br />
            <div className="card p-3">
              <h5>Terms of Service</h5>
              <p>
                This Minecraft server is associated with OneByt.cloud <br />
                Perks and pricing are subject to change without notice and by
                the athourity of OneByt.cloud <br />
                By purchasing from this store, you agree to the terms of service
                and privacy policy of OneByt.cloud
              </p>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card p-3 mb-4">
              <h5>Popular This Month</h5>
              <img
                src="https://ik.imagekit.io/1usyzu9ab/Deity.png?updatedAt=1742319285609"
                alt="Item"
                className="mb-2"
                width={150}
              />
              <p>
                <strong>Deity (30 Days)</strong>
              </p>
              <p>₹ 399/Month</p>
              <a
                href="/buy?productCode=Deity%20(30%20Days)"
                className="btn btn-glow"
              >
                Buy
              </a>
            </div>

            <div className="card p-3">
              <h5>Recent Purchases</h5>
              <div className="d-flex">Soon</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
