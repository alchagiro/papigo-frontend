import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useTripStore } from "../store/tripStore";
import { api } from "../store/authStore";
import { API_URL } from "../config";

const serverUrl = API_URL.replace('/api', '');
import {
  joinTrip,
  onDriverPosition,
  onStatusUpdated,
  sendTripStatusUpdate,
  updateDriverLocation,
  onDriverCancelled,
  onTripCancelled,
} from "../services/socket";
import GoogleMapComponent from "../components/MapComponent";

const TripProgress = () => {
  const { tripId } = useParams();
  const { user } = useAuthStore();
  const { currentTrip, startTrip, completeTrip, cancelTrip, getTripDetails, fetchTripHistory } = useTripStore();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [driverPos, setDriverPos] = useState(null);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [driverCancelled, setDriverCancelled] = useState(false);
  const [loadError, setLoadError] = useState(null);
  
  const [bonuses, setBonuses] = useState([]);
  const [selectedBonusId, setSelectedBonusId] = useState("");
  const [showBonusModal, setShowBonusModal] = useState(false);
  
  // Negotiation states - DISABLED (price is now fixed)
  // const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  // const [negotiationAmount, setNegotiationAmount] = useState("");
  // const [negotiationHistory, setNegotiationHistory] = useState([]);
  // const [offerAccepted, setOfferAccepted] = useState(false);
  // const [offerRejected, setOfferRejected] = useState(false);
  // const [showAcceptModal, setShowAcceptModal] = useState(false);
  // const [currentOffer, setCurrentOffer] = useState(null); // { amount, madeBy }

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        await getTripDetails(tripId);
        setLoadError(null);
      } catch (err) {
        console.error("Error fetching trip:", err);
        setLoadError("Error al cargar el viaje. Intenta de nuevo.");
      }
    };
    
    fetchTrip();
    joinTrip(tripId);

    const unsubscribePosition = onDriverPosition((data) => {
      setDriverPos(data);
    });

    const unsubscribeStatus = onStatusUpdated((data) => {
      if (data.tripId === tripId) {
        getTripDetails(data.tripId);
      }
    });

    // Listen for driver cancelled (trip released for another driver) - DISABLED for now
    // const unsubscribeNegotiation = onNegotiationUpdate((data) => { ... });
    // const unsubscribeOfferAccepted = onOfferAccepted((data) => { ... });
    // const unsubscribeOfferRejected = onOfferRejected((data) => { ... });
    
    const unsubscribeDriverCancelled = onDriverCancelled((data) => {
      if (data.tripId === tripId && user?.role === "passenger") {
        setDriverCancelled(true);
        getTripDetails(tripId);
      }
    });

    // Listen for trip completely cancelled
    const unsubscribeTripCancelled = onTripCancelled((data) => {
      if (data.tripId === tripId) {
        getTripDetails(tripId);
      }
    });

    const pollInterval = setInterval(() => {
      getTripDetails(tripId);
    }, 3000);

    return () => {
      unsubscribePosition();
      unsubscribeStatus();
      unsubscribeDriverCancelled();
      unsubscribeTripCancelled();
      clearInterval(pollInterval);
    };
  }, [tripId]);

  useEffect(() => {
    if (user?.role === "passenger" && currentTrip?.id && currentTrip?.passenger_id) {
      api.get(`/trips/${currentTrip.id}/bonuses`)
        .then(res => setBonuses(res.data))
        .catch(() => setBonuses([]));
    }
  }, [currentTrip?.id]);

  useEffect(() => {
    if (currentTrip?.status === "completed" && user?.role === "driver") {
      fetchTripHistory();
    }
  }, [currentTrip?.status]);

  useEffect(() => {
    if (user?.role === "driver" && currentTrip?.status === "in_progress") {
      const interval = setInterval(() => {
        updateDriverLocation({
          driverId: user.id,
          lat: 40.7128 + Math.random() * 0.01,
          lng: -74.006 + Math.random() * 0.01,
          tripId,
        });
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [user?.role, currentTrip?.status, tripId]);

  const handleStartTrip = async () => {
    setLoading(true);
    try {
      await startTrip(tripId);
      sendTripStatusUpdate({ tripId, status: "in_progress" });
      await getTripDetails(tripId);
    } catch (err) { console.error("Error al iniciar viaje"); }
    finally { setLoading(false); }
  };

  const triggerCompleteTrip = async () => {
    if (bonuses.length > 0) {
      setShowBonusModal(true);
    } else {
      handleCompleteTrip();
    }
  };

  const handleCompleteTrip = async () => {
    setLoading(true);
    setShowBonusModal(false);
    try {
      await completeTrip(tripId, {
        distance: currentTrip?.distance || 5.2,
        duration: currentTrip?.duration || 15,
        fare: currentTrip?.fare || 12500,
      });
      sendTripStatusUpdate({ tripId, status: "completed" });
      await getTripDetails(tripId);
    } catch (err) {
      console.error("Error al completar viaje:", err.response?.data?.error || err.message);
      alert("Error al completar viaje: " + (err.response?.data?.error || err.message));
    }
    finally { setLoading(false); }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/trips/cancel/${tripId}`);
      sendTripStatusUpdate({ tripId, status: response.data?.status || "cancelled" });
      setShowCancelConfirm(false);
      await getTripDetails(tripId);
      
      // Si es conductor, redirigir a la pagina principal
      if (user?.role === "driver") {
        navigate("/");
      } else if (response.data?.status === "pending") {
        setDriverCancelled(true);
        setTimeout(() => setDriverCancelled(false), 15000);
      }
    } catch (err) { 
      console.error("Error al cancelar viaje:", err);
      alert("Error: " + (err.response?.data?.error || err.message));
    }
    finally { setLoading(false); }
  };

  const handleApplyBonus = async () => {
    if (!selectedBonusId) return;
    setLoading(true);
    try {
      await api.post(`/trips/${tripId}/apply-bonus`, { bonusId: selectedBonusId });
      await getTripDetails(tripId);
      setBonuses([]);
      alert("Bono aplicado correctamente");
    } catch (err) { 
      console.error("Error al aplicar bono", err);
      alert("Error al aplicar bono");
    }
    finally { setLoading(false); }
  };

  const handleSubmitRating = async () => {
    try {
      const ratedId = user?.role === "passenger" ? currentTrip?.driver_id : currentTrip?.passenger_id;
      await api.post("/ratings", { tripId, ratedId, rating, comment });
      setRatingSubmitted(true);
    } catch (err) { console.error("Error al enviar calificacion"); }
  };

  if (loadError) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
          <h2>Error al cargar</h2>
          <p style={{ color: "#666", marginBottom: "16px" }}>{loadError}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!currentTrip) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🚗</div>
          <h2>Cargando detalles del viaje...</h2>
          <p style={{ color: "#666" }}>Por favor espera un momento</p>
        </div>
      </div>
    );
  }

  const statusLabels = {
    pending: "Esperando conductor...",
    accepted: "El conductor va en camino!",
    in_progress: "Viaje en curso",
    completed: "Viaje completado",
    cancelled: "Viaje cancelado",
  };

  const formatCOP = (amount) => {
    if (!amount && amount !== 0) return "N/A";
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
  };

  const pickupLocation = currentTrip.pickup_lat ? { lat: currentTrip.pickup_lat, lng: currentTrip.pickup_lng } : null;
  const dropoffLocation = currentTrip.dropoff_lat ? { lat: currentTrip.dropoff_lat, lng: currentTrip.dropoff_lng } : null;
  const driverLocation = driverPos ? { lat: driverPos.lat, lng: driverPos.lng } : null;

  const isActiveTrip = ["pending", "accepted", "in_progress"].includes(currentTrip.status);

  const handleGoBack = () => {
    if (isActiveTrip) {
      const confirmLeave = window.confirm("Tienes un viaje activo. ¿Estas seguro de que quieres salir? El viaje seguira activo.");
      if (!confirmLeave) return;
    }
    navigate("/");
  };

  return (
    <div>
      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src="/LogoV.png" alt="PapiGo" style={{ height: "36px", width: "auto" }} />
          <h1>Viaje</h1>
        </div>
        <div className="header-actions">
          {isActiveTrip && user?.role === "passenger" && (
            <button
              className="btn btn-danger"
              onClick={() => setShowCancelConfirm(true)}
              disabled={loading}
              style={{ marginRight: "8px" }}
            >
              ✕ Cancelar Viaje
            </button>
          )}
          {user?.role === "driver" && (currentTrip.status === "completed" || currentTrip.status === "cancelled") && (
            <button className="btn btn-primary" onClick={() => navigate("/")} style={{ marginRight: "8px" }}>
              Ir al Inicio
            </button>
          )}
          {user?.role === "passenger" && (currentTrip.status === "completed" || currentTrip.status === "cancelled") && (
            <button className="btn btn-primary" onClick={() => navigate("/")} style={{ marginRight: "8px" }}>
              Ir al Inicio
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleGoBack}>
            Volver
          </button>
        </div>
      </header>

      {showCancelConfirm && (
        <div className="modal-overlay" onClick={() => setShowCancelConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ borderRadius: "12px", maxWidth: "400px" }}>
            <h2 style={{ marginBottom: "16px" }}>¿Cancelar viaje?</h2>
            <p style={{ marginBottom: "24px", color: "#666" }}>
              {currentTrip.status === "pending"
                ? "¿Seguro que quieres cancelar? Se buscara un nuevo conductor si cambias de opinion."
                : currentTrip.status === "accepted"
                ? "El conductor ya va en camino. Si cancelas, el conductor sera notificado."
                : "El viaje esta en curso. ¿Seguro que quieres cancelar?"}
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowCancelConfirm(false)}
                style={{ flex: 1 }}
              >
                No, continuar
              </button>
              <button
                className="btn btn-danger"
                onClick={handleCancel}
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? "Cancelando..." : "Si, cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBonusModal && (
        <div className="modal-overlay" onClick={() => setShowBonusModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ borderRadius: "12px", maxWidth: "400px" }}>
            <h2 style={{ marginBottom: "16px" }}>Usar Bono del Pasajero</h2>
            <p style={{ marginBottom: "12px", color: "#666" }}>El pasajero tiene bonos disponibles. ¿Desea aplicar alguno a este viaje?</p>
            
            <select
              value={selectedBonusId}
              onChange={e => setSelectedBonusId(e.target.value)}
              style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", marginBottom: "16px" }}
            >
              <option value="">Sin bono</option>
              {bonuses.map(b => (
                <option key={b.id} value={b.id}>
                  Bono de {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(b.amount)} - {b.description || "Sin descripcion"}
                </option>
              ))}
            </select>

            <div style={{ display: "flex", gap: "12px" }}>
              <button className="btn btn-secondary" onClick={() => setShowBonusModal(false)} style={{ flex: 1 }}>Cancelar</button>
              <button className="btn btn-success" onClick={handleCompleteTrip} style={{ flex: 1 }}>Aplicar y Completar</button>
            </div>
          </div>
        </div>
      )}

      <div className="container">
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ flex: "1", minWidth: "300px" }}>
            <div className="trip-card">
              <h2>{statusLabels[currentTrip.status]}</h2>
              <p><strong>Recogida:</strong> {currentTrip.pickup_address}</p>
              <p><strong>Destino:</strong> {currentTrip.dropoff_address}</p>
              {currentTrip.passenger_name && <p><strong>Pasajero:</strong> {currentTrip.passenger_name}</p>}
              {currentTrip.driver_name && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                  {currentTrip.driver_photo_url && (
                    <img src={serverUrl + currentTrip.driver_photo_url} alt="Conductor" style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover" }} />
                  )}
                  <div>
                    <p><strong>Conductor:</strong> {currentTrip.driver_name}</p>
                    {currentTrip.driver_vehicle && <p style={{ fontSize: "14px", color: "#666" }}>Vehiculo: {currentTrip.driver_vehicle}</p>}
                  </div>
                </div>
              )}
              {currentTrip.fare && <p><strong>Tarifa:</strong> {formatCOP(currentTrip.fare)}</p>}
              {currentTrip.distance && <p><strong>Distancia:</strong> {currentTrip.distance.toFixed(1)} km</p>}
              {currentTrip.duration && <p><strong>Duracion:</strong> ~{currentTrip.duration} min</p>}
              <span className={`trip-status ${currentTrip.status}`}>{statusLabels[currentTrip.status] || currentTrip.status}</span>
            </div>

            {user?.role === "driver" && currentTrip.status === "accepted" && (
              <>
                <div className="btn-group">
                  <button className="btn btn-success" onClick={handleStartTrip} disabled={loading}>
                    {loading ? "Iniciando..." : "Iniciar Viaje"}
                  </button>
                  <button className="btn btn-danger" onClick={handleCancel}>
                    Cancelar
                  </button>
                </div>
              </>
            )}

            {user?.role === "driver" && currentTrip.status === "in_progress" && (
              <>
                <button className="btn btn-success" onClick={triggerCompleteTrip} disabled={loading}>
                  {loading ? "Completando..." : "Completar Viaje"}
                </button>
                {bonuses.length > 0 && (
                  <div style={{ fontSize: "14px", color: "#137333", marginTop: "8px" }}>
                    El pasajero tiene {bonuses.length} bono(s) disponible(s)
                  </div>
                )}
              </>
            )}

            {user?.role === "passenger" && currentTrip.status === "pending" && (
              <div className="trip-card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔍</div>
                <h3>Buscando conductor cercano...</h3>
                <p>Te notificaremos cuando un conductor acepte tu viaje</p>
              </div>
            )}

            {user?.role === "passenger" && driverCancelled && (
              <div className="trip-card" style={{ borderLeft: "4px solid var(--warning)", background: "#fff3cd" }}>
                <h3 style={{ color: "#856404" }}>⚠️ El conductor canceló</h3>
                <p style={{ color: "#856404" }}>Estamos buscando otro conductor cercano para ti...</p>
              </div>
            )}

            {user?.role === "passenger" && currentTrip.status === "completed" && !ratingSubmitted && (
              <div className="trip-card">
                <h3>Califica a tu conductor</h3>
                <div className="rating-input">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className={`star ${star <= rating ? "active" : ""}`} onClick={() => setRating(star)}>★</span>
                  ))}
                </div>
                <div className="form-group">
                  <input type="text" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Agrega un comentario (opcional)" />
                </div>
                <button className="btn btn-primary" disabled={!rating} onClick={handleSubmitRating}>
                  Enviar Calificacion
                </button>
              </div>
            )}

            {user?.role === "passenger" && currentTrip.status === "completed" && bonuses.length > 0 && !currentTrip.bonus_amount && (
              <div className="trip-card" style={{ borderLeft: "4px solid #fbbc04" }}>
                <h3>🎫 Tienes bonos disponibles</h3>
                <p>¿Quieres usar un bono para este viaje?</p>
                <select
                  value={selectedBonusId}
                  onChange={e => setSelectedBonusId(e.target.value)}
                  style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ddd", marginBottom: "12px" }}
                >
                  <option value="">Sin bono</option>
                  {bonuses.map(b => (
                    <option key={b.id} value={b.id}>
                      {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(b.amount)} - {b.description || "Sin descripcion"}
                    </option>
                  ))}
                </select>
                <button className="btn btn-success" onClick={handleApplyBonus} disabled={!selectedBonusId}>
                  Usar Bono
                </button>
              </div>
            )}

            {ratingSubmitted && (
              <div className="success-message">¡Gracias por tu calificacion!</div>
            )}

             {currentTrip.status === "cancelled" && (
              <div className="trip-card" style={{ textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>❌</div>
                <h3>Viaje cancelado</h3>
                <p>Puedes solicitar un nuevo viaje desde el inicio</p>
              </div>
            )}
          </div>

          <div style={{ flex: "2", minWidth: "300px", height: "500px" }}>
            {pickupLocation && dropoffLocation ? (
              <GoogleMapComponent
                pickupLocation={pickupLocation}
                dropoffLocation={dropoffLocation}
                driverLocation={driverLocation}
                zoom={14}
              />
            ) : (
              <div style={{ 
                height: "100%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                background: "#f5f5f5",
                borderRadius: "12px"
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "48px", marginBottom: "12px" }}>📍</div>
                  <p style={{ color: "#666" }}>Ubicaciones no disponibles</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODALES DE NEGOCIACIÓN - DESHABILITADOS */}
      {/* Los modales de negociación han sido desactivados. El precio ahora es fijo. */}

    </div>
  );
};

export default TripProgress;
