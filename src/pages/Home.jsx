import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useTripStore } from "../store/tripStore";
import { joinTrip } from "../services/socket";
import { api } from "../store/authStore";
import GoogleMapComponent from "../components/MapComponent";

const Home = () => {
  const { user, logout } = useAuthStore();
  const { calculateFare, requestTrip, currentTrip } = useTripStore();
  const navigate = useNavigate();

  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [distanceInfo, setDistanceInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeBonuses, setActiveBonuses] = useState([]);
  const [selectedBonusId, setSelectedBonusId] = useState("");
  const [vehicleType, setVehicleType] = useState("car");
  
  useEffect(() => {
    if (user?.role === "passenger") {
      api.get(`/trips/user/bonuses`)
        .then(res => setActiveBonuses(res.data))
        .catch(() => setActiveBonuses([]));
    }
  }, [user]);

  const handlePickupChange = useCallback((location, address) => {
    setPickupLocation(location);
    setPickupAddress(address);
  }, []);

  const handleDropoffChange = useCallback((location, address) => {
    setDropoffLocation(location);
    setDropoffAddress(address);
  }, []);

  const handleDistanceChange = useCallback((info) => {
    setDistanceInfo(info);
  }, []);

  const handleEstimateFare = async () => {
    if (!pickupLocation || !dropoffLocation) {
      setError("Selecciona las ubicaciones en el mapa");
      return;
    }

    try {
      setError("");
      if (distanceInfo) {
        let perKm;
        const outsideCities = ["palmira", "yumbo", "jamundi", "candelaria"];
        const intercitySurcharge = 20000;
        
        if (vehicleType === 'motorcycle') {
          perKm = 700;
        } else {
          perKm = 1250;
        }
        
        const calculatedFare = distanceInfo.distance * perKm;
        let fare = Math.round(calculatedFare);

        if (outsideCities.some(c => dropoffAddress?.toLowerCase().includes(c)) ||
            outsideCities.some(c => pickupAddress?.toLowerCase().includes(c))) {
          fare += intercitySurcharge;
        }

        setDistanceInfo((prev) => ({ ...prev, fare }));
      }
    } catch (err) {
      setError("Error al calcular la tarifa");
    }
  };

  const handleRequestTrip = async () => {
    if (!pickupAddress || !dropoffAddress || !pickupLocation || !dropoffLocation) {
      setError("Selecciona recogida y destino en el mapa");
      return;
    }

    try {
      setError("");
      setLoading(true);

      let fare = null;
      
      // Usar precio estimado del sistema
      if (distanceInfo?.fare) {
        fare = distanceInfo.fare;
      } else {
        const fareResult = await calculateFare(
          pickupLocation.lat,
          pickupLocation.lng,
          dropoffLocation.lat,
          dropoffLocation.lng,
          vehicleType
        );
        fare = fareResult.fare;
      }

      const trip = await requestTrip({
        pickupLat: pickupLocation.lat,
        pickupLng: pickupLocation.lng,
        pickupAddress,
        dropoffLat: dropoffLocation.lat,
        dropoffLng: dropoffLocation.lng,
        dropoffAddress,
        paymentMethod: "card",
        fare,
        bonusId: selectedBonusId || null,
        vehicleType: vehicleType,
      });

      joinTrip(trip.id);
      navigate(`/trip/${trip.id}`);
    } catch (err) {
      console.error("Error requesting trip:", err);
      setError("Error al solicitar el viaje: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleGoToTrip = () => {
    navigate(`/trip/${currentTrip.id}`);
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
    pending: "Esperando conductor...",
    accepted: "Conductor en camino",
    in_progress: "Viaje en curso",
    completed: "Viaje completado",
    cancelled: "Viaje cancelado",
  };

  return (
    <div>
      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #00ab67 0%, #000000 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0, 171, 103, 0.3)"
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M5 17h14M5 17c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2M5 17c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2-2M19 17c0 1.1.9 2 2 2s2-.9 2-2-.9-2-2-2-2M7 9l2-3h6l2 3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: "800" }}>PapiGo</h1>
        </div>
        <div className="header-actions">
          <span style={{ fontWeight: "600" }}>Hola, {user?.name}</span>
          <button className="btn btn-secondary" onClick={() => navigate("/history")}>
            📋 Historial
          </button>
          <button className="btn btn-ghost" onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>
      </header>

      <div className="container">
        {activeBonuses.length > 0 && user?.role === "passenger" && (
          <div className="trip-card" style={{ borderLeft: "4px solid #fbbc04", marginBottom: "20px" }}>
            <h3>🎫 Tienes Bonos Disponibles</h3>
            <p style={{ marginBottom: "12px", fontSize: "14px" }}>Selecciona un bono para aplicar a este viaje:</p>
            <select
              value={selectedBonusId}
              onChange={e => setSelectedBonusId(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "var(--radius)", border: "2px solid var(--border)", marginBottom: "12px", fontSize: "14px" }}
            >
              <option value="">Sin bono</option>
              {activeBonuses.map(b => (
                <option key={b.id} value={b.id}>
                  {formatCOP(b.amount)} - {b.description || "Sin descripcion"}
                </option>
              ))}
            </select>
            {selectedBonusId && distanceInfo?.fare && (
              <div style={{ background: "#e6f4ea", padding: "12px", borderRadius: "var(--radius)", marginTop: "8px" }}>
                <div style={{ fontSize: "14px", color: "#666" }}>Tarifa original: {formatCOP(distanceInfo.fare)}</div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#137333" }}>
                  Tarifa con bono: {formatCOP(Math.max(0, distanceInfo.fare - (activeBonuses.find(b => b.id === selectedBonusId)?.amount || 0)))}
                </div>
              </div>
            )}
          </div>
        )}

        {currentTrip && currentTrip.status !== "completed" && currentTrip.status !== "cancelled" && (
          <div className="trip-card" style={{ borderLeft: "4px solid var(--info)", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ marginBottom: "4px" }}>🚗 Viaje Activo</h3>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                  {statusLabels[currentTrip.status] || currentTrip.status}
                </p>
                <p style={{ fontSize: "14px" }}>
                  {currentTrip.pickup_address} → {currentTrip.dropoff_address}
                </p>
              </div>
              <button className="btn btn-primary" onClick={handleGoToTrip} style={{ width: "auto", padding: "10px 20px" }}>
                Ver Viaje
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ width: "380px", minWidth: "300px" }}>
            <div className="trip-form">
              <h2>📍 Solicitar Viaje</h2>

              {error && <div className="error-message">{error}</div>}

              <div className="location-inputs">
                <div className="location-input-group">
                  <div className="marker">
                    <div className="marker-dot pickup"></div>
                    <div className="marker-line"></div>
                  </div>
                  <input
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    placeholder="Haz click en el mapa para seleccionar"
                    style={{ fontSize: "14px" }}
                  />
                </div>

                <div className="location-input-group">
                  <div className="marker">
                    <div className="marker-dot dropoff"></div>
                  </div>
                  <input
                    type="text"
                    value={dropoffAddress}
                    onChange={(e) => setDropoffAddress(e.target.value)}
                    placeholder="Haz click en el mapa para seleccionar"
                    style={{ fontSize: "14px" }}
                  />
                </div>
              </div>

              {distanceInfo && (
                <div className="fare-estimate">
                  <div>
                    <div className="amount">{formatCOP(distanceInfo.fare)}</div>
                    <div className="details">
                      {distanceInfo.distance.toFixed(1)} km • ~{distanceInfo.duration} min
                    </div>
                  </div>
                </div>
              )}

<div className="form-group" style={{ marginBottom: "16px" }}>
                <label>Tipo de Vehículo</label>
                <div className="filter-group" style={{ marginBottom: 0 }}>
                  <button
                    type="button"
                    className={`filter-btn ${vehicleType === "car" ? "active" : ""}`}
                    onClick={() => setVehicleType("car")}
                  >
                    🚗 Carro
                  </button>
                  <button
                    type="button"
                    className={`filter-btn ${vehicleType === "motorcycle" ? "active" : ""}`}
                    onClick={() => setVehicleType("motorcycle")}
                  >
                    🏍️ Moto
                  </button>
                </div>
              </div>

              <div className="btn-group">
                <button
                  className="btn btn-secondary"
                  onClick={handleEstimateFare}
                >
                  Calcular Tarifa
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleRequestTrip}
                  disabled={!pickupAddress || !dropoffAddress || loading}
                >
                  {loading ? "Solicitando..." : "Solicitar Viaje"}
                </button>
              </div>
            </div>
          </div>

          <div style={{ flex: "1", minWidth: "400px", height: "550px" }}>
            <GoogleMapComponent
              pickupLocation={pickupLocation}
              dropoffLocation={dropoffLocation}
              onPickupChange={handlePickupChange}
              onDropoffChange={handleDropoffChange}
              onDistanceChange={handleDistanceChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
