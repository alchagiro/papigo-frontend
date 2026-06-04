import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { api } from "../store/authStore";
import { joinDrivers, updateDriverLocation } from "../services/socket";
import GoogleMapComponent from "../components/MapComponent";

const DriverHome = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [isActive, setIsActive] = useState(false);
  const [pendingTrips, setPendingTrips] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [filter, setFilter] = useState("day");
  const [earnings, setEarnings] = useState(null);
  const [debt, setDebt] = useState(null);
  const [completedTrips, setCompletedTrips] = useState([]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setCurrentLocation(loc);
          if (isActive) updateDriverLocation({ driverId: user.id, lat: loc.lat, lng: loc.lng });
        },
        (error) => console.error("Error ubicacion:", error)
      );
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      joinDrivers();
      fetchPendingTrips();
      fetchEarnings();
      fetchDebt();
      const interval = setInterval(() => {
        fetchPendingTrips();
        fetchActiveTrip();
        if (currentLocation && user) updateDriverLocation({ driverId: user.id, lat: currentLocation.lat, lng: currentLocation.lng });
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isActive, currentLocation, user, filter]);

  useEffect(() => {
    fetchActiveTrip();
  }, []);

  const fetchPendingTrips = async () => {
    try {
      const response = await api.get("/trips/pending");
      setPendingTrips(response.data);
    } catch (err) { console.error("Error al obtener viajes"); }
  };

  const fetchActiveTrip = async () => {
    try {
      const response = await api.get("/trips/history");
      const active = response.data.find((t) => t.status === "accepted" || t.status === "in_progress");
      setActiveTrip(active || null);
    } catch (err) { console.error("Error al obtener viaje activo"); }
  };

  const fetchEarnings = async () => {
    try {
      const response = await api.get("/trips/earnings");
      setEarnings(response.data);
    } catch (err) { console.error("Error al obtener ganancias"); }
  };

  const fetchDebt = async () => {
    try {
      const response = await api.get("/earnings/debt");
      setDebt(response.data);
    } catch (err) { console.error("Error al obtener deuda"); }
  };

  const handleToggleActive = async () => {
    try {
      await api.patch("/drivers/status", { isActive: !isActive });
      setIsActive(!isActive);
      if (!isActive && currentLocation && user) updateDriverLocation({ driverId: user.id, lat: currentLocation.lat, lng: currentLocation.lng });
    } catch (err) { console.error("Error al actualizar estado"); }
  };

  const handleAcceptTrip = async (tripId) => {
    try {
      setLoading(true);
      await api.post(`/trips/accept/${tripId}`);
      navigate(`/trip/${tripId}`);
    } catch (err) { console.error("Error al aceptar viaje"); }
    finally { setLoading(false); }
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  const formatCOP = (amount) => {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  const handleLocationChange = useCallback((location, addr) => { setCurrentLocation(location); }, []);

  const filterLabels = { day: "Hoy", week: "Esta Semana", month: "Este Mes", all: "Todo" };

  return (
    <div>
      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/LogoV.png" alt="PapiGo" style={{ height: "36px", width: "auto" }} />
          <h1>Modo Conductor</h1>
        </div>
        <div className="header-actions">
          <span>{user?.name}</span>
          <button className={`btn ${isActive ? "btn-danger" : "btn-success"}`} onClick={handleToggleActive}>
            {isActive ? "Desconectarse" : "Conectarse"}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/history")}>Historial</button>
          <button className="btn btn-secondary" onClick={handleLogout}>Cerrar Sesion</button>
        </div>
      </header>

      <div className="container">
        {activeTrip && (
          <div className="trip-card" style={{ borderLeft: "4px solid #276ef1", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ marginBottom: "4px" }}>🚗 Viaje en Curso</h3>
                <p style={{ fontSize: "14px", color: "#666" }}>{activeTrip.status === "accepted" ? "Aceptado" : "En curso"}</p>
                <p style={{ fontSize: "14px" }}>{activeTrip.pickup_address} → {activeTrip.dropoff_address}</p>
              </div>
              <button className="btn btn-primary" onClick={() => navigate(`/trip/${activeTrip.id}`)} style={{ width: "auto", padding: "10px 20px" }}>Ver Viaje</button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ width: "400px", minWidth: "300px" }}>
            <div className="trip-form">
              <h2>Tu Estado</h2>
              <div style={{ padding: "16px", borderRadius: "8px", background: isActive ? "#d4edda" : "#f8d7da", color: isActive ? "#155724" : "#721c24", fontWeight: "600", textAlign: "center", marginBottom: "16px" }}>
                {isActive ? "🟢 Estas en linea - Aceptando viajes" : "🔴 Estas desconectado"}
              </div>

              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                {["day", "week", "month", "all"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    style={{
                      flex: 1, padding: "8px", border: filter === f ? "2px solid #000" : "1px solid #ddd",
                      borderRadius: "6px", background: filter === f ? "#000" : "white",
                      color: filter === f ? "white" : "#333", cursor: "pointer", fontSize: "12px", fontWeight: "600",
                    }}
                  >
                    {filterLabels[f]}
                  </button>
                ))}
              </div>

          {earnings && (
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                  <div style={{ flex: 1, background: "#e8f0fe", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "20px", fontWeight: "700", color: "#1a73e8" }}>{formatCOP(earnings.total_earnings)}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>Ganancia Total ({filterLabels[filter]})</div>
                  </div>
                  <div style={{ flex: 1, background: "#d4edda", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "20px", fontWeight: "700", color: "#155724" }}>{formatCOP(earnings.net_earnings)}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>Ganancia Neta ({filterLabels[filter]})</div>
                  </div>
                  <div style={{ flex: 1, background: "#fff3cd", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "20px", fontWeight: "700", color: "#856404" }}>{formatCOP(earnings.platform_commission)}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>Comisión Plataforma</div>
                  </div>
                  <div style={{ flex: 1, background: "#e6f4ea", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "20px", fontWeight: "700", color: "#137333" }}>{earnings.total_trips}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>Viajes</div>
                  </div>
                  <div style={{ flex: 1, background: "#fce8e6", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "20px", fontWeight: "700", color: "#c5221f" }}>{parseFloat(earnings.total_distance).toFixed(1)} km</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>Distancia</div>
                  </div>
                  <div style={{ flex: 1, background: "#f0f0f0", padding: "12px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "20px", fontWeight: "700", color: "#333" }}>{formatCOP(earnings.total_bonuses)}</div>
                    <div style={{ fontSize: "12px", color: "#666" }}>Bonos Usados</div>
                  </div>
                </div>
              )}

{debt && (
                <div style={{ background: (debt.amount_owed || 0) > 0 ? "#fff3cd" : "#e6f4ea", padding: "16px", borderRadius: "8px", marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "600" }}>Deuda con la plataforma</div>
                      <div style={{ fontSize: "24px", fontWeight: "700", color: (debt.amount_owed || 0) > 0 ? "#856404" : "#137333" }}>
                        {formatCOP(debt.amount_owed || 0)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: "12px", color: "#666" }}>
                      <div>Comision: {debt.platform_percentage || 25}%</div>
                      {debt.last_payment_date && <div>Ultimo pago: {new Date(debt.last_payment_date).toLocaleDateString("es-CO")}</div>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <h2 style={{ marginTop: "24px", marginBottom: "16px" }}>Solicitudes de Viaje ({pendingTrips.length})</h2>

            {pendingTrips.length === 0 ? (
              <div className="empty-state"><div className="icon">🚗</div><p>No hay viajes pendientes</p></div>
            ) : (
              pendingTrips.map((trip) => (
                <div key={trip.id} className="trip-card">
                  <h3>Solicitud de Viaje</h3>
                  <p><strong>Recogida:</strong> {trip.pickup_address}</p>
                  <p><strong>Destino:</strong> {trip.dropoff_address}</p>
                  <p><strong>Pasajero:</strong> {trip.passenger_name}</p>
                  {trip.fare && <p><strong>Tarifa:</strong> {formatCOP(trip.fare)}</p>}
                  <button className="btn btn-success" onClick={() => handleAcceptTrip(trip.id)} disabled={loading} style={{ marginTop: "12px" }}>
                    {loading ? "Aceptando..." : "Aceptar Viaje"}
                  </button>
                </div>
              ))
            )}
          </div>

          <div style={{ flex: "1", minWidth: "400px", height: "550px" }}>
            <GoogleMapComponent
              pickupLocation={activeTrip ? { lat: activeTrip.pickup_lat, lng: activeTrip.pickup_lng } : currentLocation}
              dropoffLocation={activeTrip ? { lat: activeTrip.dropoff_lat, lng: activeTrip.dropoff_lng } : null}
              onPickupChange={handleLocationChange}
              onDropoffChange={() => {}}
              driverLocation={currentLocation}
              zoom={isActive ? 13 : 15}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverHome;

