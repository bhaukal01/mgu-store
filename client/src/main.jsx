import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Index from "./Index.jsx";
import Ranks from "./Ranks.jsx";
import Crates from "./Crates.jsx";
import RankUp from "./RankUp.jsx";
import Buy from "./Buy.jsx";
import AdminLogin from "./AdminLogin.jsx"; // New for admin login
import AdminDashboard from "./AdminDashboard.jsx"; // New for admin panel
import PaymentSuccess from "./PaymentSuccess.jsx";

import "./styles/index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/ranks" element={<Ranks />} />
        <Route path="/crates" element={<Crates />} />
        <Route path="/upgrades" element={<RankUp />} />
        <Route path="/buy" element={<Buy />} />
        <Route path="/admin" element={<AdminLogin />} /> {/* New */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />{" "}
        <Route path="/success" element={<PaymentSuccess />} />
        {/* New */}
      </Routes>
    </Router>
  </StrictMode>
);
