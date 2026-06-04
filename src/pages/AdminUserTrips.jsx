import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { api } from "../store/authStore";

const AdminUserTrips = () => {
  const { userId } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/");
      return;
    }
    
    fetchUserAndTrips();
  }, [userId]);

  const fetchUserAndTrips = async () => {
    setLoading(true);
    try {
      const [userRes, tripsRes] = await Promise.all([
        api.get(`/admin/users/${userId}`),
        api.get(`/admin/users/${userId}/trips`)
      ]);
      
      setUserInfo(userRes.data);
      setTrips(tripsRes.data);
    } catch (err) {
      console.error("Error al obtener datos", err);
    } finally {
      setLoading(false);
    }
  };

  const formatCOP = (amount) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statusLabels = {
    pending: "Esperando conductor",
    accepted: "Conductor en camino",
    in_progress: "En curso",
    completed: "Completado",
    cancelled: "Cancelado",
  };

  const getStatusColor = (status) => {
    switch(status) {
      case "completed": return "#137333";
      case "cancelled": return "#d93025";
      case "in_progress": return "#276ef1";
      case "accepted": return "#f9ab00";
      default: return "#666";
    }
  };

  if (!user || user.role !== "admin") return null;

  return (
    <div>
      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/LogoV.png" alt="PapiGo" style={{ height: "36px", width: "auto" }} />
          <h1>Historial de Viajes</h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => navigate("/")}>
            Volver al Panel
          </button>
        </div>
      </header>

      <div className="container">
        {userInfo && (
          <div className="trip-card" style={{ marginBottom: "20px" }}>
            <h2>{userInfo.name}</h2>
            <p style={{ fontSize: "14px", color: "#666" }}>{userInfo.email}</p>
            <p style={{ fontSize: "14px", color: "#666" }}>
              Rol: {userInfo.role === "driver" ? "Conductor" : "Pasajero"} • 
              Viajes completados: {userInfo.completed_trips || 0}
            </p>
          </div>
        )}

        {loading ? (
          <div className="loading">Cargando viajes...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {trips.length === 0 ? (
              <div className="trip-card" style={{ textAlign: "center", padding: "40px" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
                <h3>No hay viajes</h3>
                <p>Este usuario no ha realizado viajes aún.</p>
              </div>
            ) : (
              trips.map(trip => (
                <div key={trip.id} className="trip-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h3 style={{ marginBottom: "4px" }}>
                        {trip.pickup_address} → {trip.dropoff_address}
                      </h3>
                      <p style={{ fontSize: "14px", color: "#666" }}>
                        {trip.passenger_name && `Pasajero: ${trip.passenger_name} • `}
                        {trip.driver_name && `Conductor: ${trip.driver_name}`}
                      </p>
                      <p style={{ fontSize: "14px", color: "#666" }}>
                        {new Date(trip.created_at).toLocaleDateString("es-CO")} • 
                        {trip.distance?.toFixed(1)} km • 
                        ~{trip.duration} min
                      </p>
                      {trip.bonus_amount > 0 && (
                        <div style={{ fontSize: "12px", color: "#137333", marginTop: "4px" }}>
                          🎫 Bono aplicado: {formatCOP(trip.bonus_amount)}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {trip.fare && (
                        <div style={{ fontSize: "20px", fontWeight: "700", color: "#1a73e8", marginBottom: "8px" }}>
                          {formatCOP(trip.fare)}
                        </div>
                      )}
                      <span className="trip-status" style={{ 
                        background: getStatusColor(trip.status) + "20", 
                        color: getStatusColor(trip.status),
                        padding: "4px 12px",
                        borderRadius: "16px",
                        fontSize: "12px",
                        fontWeight: "600"
                      }}>
                        {statusLabels[trip.status] || trip.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserTrips;
