import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTripStore } from "../store/tripStore";
import { useAuthStore } from "../store/authStore";

const TripHistory = () => {
  const { trips, fetchTripHistory } = useTripStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchTripHistory().finally(() => {
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Fecha no disponible";
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-CO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
    pending: "Pendiente",
    accepted: "Aceptado",
    in_progress: "En curso",
    completed: "Completado",
    cancelled: "Cancelado",
  };

  const handleTripClick = (trip) => {
    navigate(`/trip/${trip.id}`);
  };

  const activeTrips = trips.filter(
    (t) => t.status === "pending" || t.status === "accepted" || t.status === "in_progress"
  );
  const pastTrips = trips.filter(
    (t) => t.status === "completed" || t.status === "cancelled"
  );

  return (
    <div>
      <header className="header">
        <h1>Historial de Viajes</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => navigate("/")}>
            Volver
          </button>
          <button className="btn btn-secondary" onClick={handleLogout}>
            Cerrar Sesion
          </button>
        </div>
      </header>

      <div className="container">
        {loading ? (
          <div className="loading">Cargando historial...</div>
        ) : trips.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>No hay viajes registrados</p>
          </div>
        ) : (
          <>
            {activeTrips.length > 0 && (
              <>
                <h2 style={{ marginBottom: "12px", fontSize: "18px" }}>🚗 Viajes Activos</h2>
                {activeTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="trip-card"
                    style={{ cursor: "pointer", borderLeft: "4px solid #276ef1", marginBottom: "12px" }}
                    onClick={() => handleTripClick(trip)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3>{formatDate(trip.created_at)}</h3>
                      <span className={`trip-status ${trip.status}`}>
                        {statusLabels[trip.status] || trip.status}
                      </span>
                    </div>
                    <p><strong>Desde:</strong> {trip.pickup_address}</p>
                    <p><strong>Hasta:</strong> {trip.dropoff_address}</p>
                    {trip.other_name && (
                      <p><strong>{user?.role === "passenger" ? "Conductor" : "Pasajero"}:</strong> {trip.other_name}</p>
                    )}
                    {trip.fare && (
                      <p>
                        <strong>Tarifa:</strong> {formatCOP(trip.fare)} | <strong>Distancia:</strong> {trip.distance?.toFixed(1)} km
                      </p>
                    )}
                  </div>
                ))}
              </>
            )}

            {pastTrips.length > 0 && (
              <>
                <h2 style={{ marginBottom: "12px", marginTop: activeTrips.length > 0 ? "24px" : "0", fontSize: "18px" }}>
                  📋 Viajes Pasados
                </h2>
                {pastTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className="trip-card"
                    style={{ cursor: "pointer", marginBottom: "12px" }}
                    onClick={() => handleTripClick(trip)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3>{formatDate(trip.created_at)}</h3>
                      <span className={`trip-status ${trip.status}`}>
                        {statusLabels[trip.status] || trip.status}
                      </span>
                    </div>
                    <p><strong>Desde:</strong> {trip.pickup_address}</p>
                    <p><strong>Hasta:</strong> {trip.dropoff_address}</p>
                    {trip.other_name && (
                      <p><strong>{user?.role === "passenger" ? "Conductor" : "Pasajero"}:</strong> {trip.other_name}</p>
                    )}
                    {trip.fare && (
                      <p>
                        <strong>Tarifa:</strong> {formatCOP(trip.fare)} | <strong>Distancia:</strong> {trip.distance?.toFixed(1)} km
                      </p>
                    )}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TripHistory;
