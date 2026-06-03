import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import TripProgress from "./pages/TripProgress";
import TripHistory from "./pages/TripHistory";
import DriverHome from "./pages/DriverHome";
import AdminPanel from "./pages/AdminPanel";
import AdminUserTrips from "./pages/AdminUserTrips";
import { useAuthStore } from "./store/authStore";
import appConfig from "./config/appConfig";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" />;
  }

  return children;
};

const App = () => {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <>
      {isAuthenticated && (
        <header className="header">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #00ab67 0%, #000000 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0, 171, 103, 0.3)"
            }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M5 17h14M5 17c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2M5 17c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2M19 17c0 1.1.9 2 2 2s2-.9 2-2-.9-2-2-2-2M7 9l2-3h6l2 3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            </div>
            <h1 style={{ 
              fontSize: "24px", 
              fontWeight: "800", 
              background: "linear-gradient(135deg, #000000 0%, #00ab67 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.5px"
            }}>
              {appConfig.name || "Uber Clone"}
            </h1>
          </div>
        </header>
      )}
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {user?.role === "admin" ? <AdminPanel /> : user?.role === "driver" ? <DriverHome /> : <Home />}
            </ProtectedRoute>
          }
        />
        <Route path="/trip/:tripId" element={<ProtectedRoute><TripProgress /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><TripHistory /></ProtectedRoute>} />
        <Route path="/admin/user/:userId/trips" element={<ProtectedRoute requiredRole="admin"><AdminUserTrips /></ProtectedRoute>} />
      </Routes>
    </>
  );
};

export default App;
