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
  const [profile, setProfile] = useState(null);
  const [ratingInfo, setRatingInfo] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [completedTrips, setCompletedTrips] = useState([]);

  const filterLabels = {
    day: "Hoy",
    week: "Semana",
    month: "Mes",
    all: "Todo",
  };

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
    fetchProfile();
    fetchRating();
  }, []);

  useEffect(() => {
    if (isActive) {
      joinDrivers(user?.id);
      fetchPendingTrips();
      fetchEarnings();
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

  const fetchActiveTrip = async () => {
    try {
      const response = await api.get("/trips/history");
      const active = response.data.find((t) => t.status === "accepted" || t.status === "in_progress");
      setActiveTrip(active || null);
    } catch (err) { console.error("Error al obtener viaje activo"); }
  };

  const fetchProfile = async () => {
    try {
      const response = await api.get("/drivers/profile");
      setProfile(response.data);
    } catch (err) { console.error("Error al obtener perfil"); }
  };

  const fetchRating = async () => {
    try {
      const response = await api.get("/drivers/rating");
      setRatingInfo(response.data);
    } catch (err) { console.error("Error al obtener calificación"); }
  };

  const fetchEarnings = async () => {
    try {
      const earningsRes = await api.get(`/trips/earnings`);
      setEarnings(earningsRes.data);
      setCompletedTrips([]);
    } catch (err) { 
      console.error("Error al obtener ganancias:", err); 
      setEarnings({ total_earnings: 0, net_earnings: 0, platform_commission: 0, total_trips: 0, total_distance: 0, total_bonuses: 0 });
      setCompletedTrips([]);
    }
  };

  const fetchPendingTrips = async () => {
    try {
      const response = await api.get("/trips/pending");
      setPendingTrips(response.data);
    } catch (err) { console.error("Error al obtener solicitudes"); }
  };

  const handleToggleActive = async () => {
    try {
      // Si intenta desconectarse, verificar que no tenga viaje activo
      if (isActive && activeTrip) {
        alert("No puedes desconectarte mientras tienes un viaje activo. Completa o cancela el viaje primero.");
        return;
      }
      await api.patch("/drivers/status", { isActive: !isActive });
      setIsActive(!isActive);
    } catch (err) { 
      console.error("Error al cambiar estado"); 
      alert(err.response?.data?.error || "Error al cambiar estado");
    }
  };

  const handleAcceptTrip = async (tripId) => {
    try {
      setLoading(true);
      const response = await api.post(`/trips/accept/${tripId}`);
      fetchPendingTrips();
      fetchActiveTrip();
      if (response.data.id) {
        navigate(`/trip/${response.data.id}`);
      }
    } catch (err) { console.error("Error al aceptar viaje"); }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
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

  if (!user || user.role !== "driver") {
    navigate("/");
    return null;
  }

  return (
    <div>
      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/LogoV.png" alt="PapiGo" style={{ height: "36px", width: "auto" }} />
          <h1 style={{ fontSize: "22px", fontWeight: "800" }}>Conductor</h1>
        </div>
          <h1 style={{ fontSize: "22px", fontWeight: "800" }}>Conductor</h1>
        </div>
        <div className="header-actions">
          <span style={{ fontWeight: "600" }}>Hola, {user?.name}</span>
          {ratingInfo && (
            <span style={{ fontSize: "14px", color: "#f9ab00", fontWeight: "600" }}>
              ★ {parseFloat(ratingInfo.average).toFixed(1)} ({ratingInfo.count} votos)
            </span>
          )}
          <button className="btn btn-ghost" onClick={() => navigate("/history")}>
            Historial
          </button>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>
      </header>

      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "700" }}>Mis Ganancias</h2>
          <button
            className={`btn ${isActive ? "btn-danger" : "btn-success"}`}
            onClick={handleToggleActive}
            disabled={isActive && activeTrip && activeTrip.status !== "completed" && activeTrip.status !== "cancelled"}
            title={isActive && activeTrip ? "No puedes desconectarte con un viaje activo" : ""}
          >
            {isActive ? "🔴 Desconectar" : "🟢 Conectar"}
          </button>
        </div>

        <div className="filter-group">
          {["day", "week", "month", "all"].map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {earnings && earnings.total_earnings !== undefined && (
          <div className="stats-grid">
            <div className="stat-card" style={{ borderLeftColor: "var(--info)" }}>
              <div className="value">{formatCOP(earnings.total_earnings || 0)}</div>
              <div className="label">Ganancia Total ({filterLabels[filter]})</div>
            </div>
            <div className="stat-card" style={{ borderLeftColor: "var(--success)" }}>
              <div className="value">{formatCOP(earnings.net_earnings || 0)}</div>
              <div className="label">Ganancia Neta ({filterLabels[filter]})</div>
            </div>
            <div className="stat-card" style={{ borderLeftColor: "var(--warning)" }}>
              <div className="value">{formatCOP(earnings.platform_commission || 0)}</div>
              <div className="label">Comision Plataforma</div>
            </div>
            <div className="stat-card" style={{ borderLeftColor: "var(--primary)" }}>
              <div className="value">{earnings.total_trips || 0}</div>
              <div className="label">Viajes</div>
            </div>
            <div className="stat-card" style={{ borderLeftColor: "var(--danger)" }}>
              <div className="value">{parseFloat(earnings.total_distance || 0).toFixed(1)} km</div>
              <div className="label">Distancia</div>
            </div>
            <div className="stat-card" style={{ borderLeftColor: "var(--text-secondary)" }}>
              <div className="value">{formatCOP(earnings.total_bonuses || 0)}</div>
              <div className="label">Bonos Usados</div>
            </div>
          </div>
        )}

        <h2 style={{ marginTop: "32px", marginBottom: "16px", fontSize: "20px", fontWeight: "700" }}>Solicitudes de Viaje ({pendingTrips.length})</h2>

        {pendingTrips.length === 0 ? (
          <div className="empty-state"><div className="icon">🚗</div><p>No hay viajes pendientes</p></div>
        ) : (
          pendingTrips.map((trip) => (
            <div key={trip.id} className="trip-card">
              <h3>Solicitud de Viaje {trip.vehicle_type === 'motorcycle' ? '🏍️ Moto' : '🚗 Carro'}</h3>
              <p><strong>Recogida:</strong> {trip.pickup_address}</p>
              <p><strong>Destino:</strong> {trip.dropoff_address}</p>
              <p><strong>Pasajero:</strong> {trip.passenger_name}</p>
              {trip.fare && <p><strong>Tarifa:</strong> {formatCOP(trip.fare)}</p>}
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleAcceptTrip(trip.id)}
                  disabled={loading || (activeTrip && activeTrip.status !== "completed" && activeTrip.status !== "cancelled")}
                >
                  {loading ? "Aceptando..." : (activeTrip && activeTrip.status !== "completed" && activeTrip.status !== "cancelled") ? "Ya tienes un viaje activo" : "Aceptar Viaje"}
                </button>
              </div>
            </div>
          ))
        )}

        {activeTrip && activeTrip.status !== "completed" && activeTrip.status !== "cancelled" && (
          <div className="trip-card" style={{ borderLeft: "4px solid var(--info)", marginTop: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ marginBottom: "4px" }}>🚗 Viaje Activo</h3>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                  {activeTrip.status === "accepted" ? "Conductor en camino" :
                   activeTrip.status === "in_progress" ? "Viaje en curso" : "Esperando conductor..."}
                </p>
                <p style={{ fontSize: "14px" }}>
                  {activeTrip.pickup_address} → {activeTrip.dropoff_address}
                </p>
              </div>
              <button className="btn btn-primary" onClick={() => navigate(`/trip/${activeTrip.id}`)} style={{ width: "auto", padding: "10px 20px" }}>
                Ver Viaje
              </button>
            </div>
          </div>
        )}

        {isActive && (
          <div style={{ flex: 1, minWidth: "400px", height: "550px", marginTop: "20px" }}>
            <GoogleMapComponent
              driverLocation={currentLocation}
              trips={pendingTrips}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverHome;
