import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  useJsApiLoader,
} from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "../config/maps";

const libraries = ["places"];

const mapContainerStyle = {
  width: "100%",
  height: "100%",
  borderRadius: "12px",
};

const defaultOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  clickableIcons: false,
};

const GoogleMapComponent = ({
  pickupLocation,
  dropoffLocation,
  onPickupChange,
  onDropoffChange,
  onDistanceChange,
  driverLocation,
  zoom = 13,
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [directions, setDirections] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 3.4516, lng: -76.532 });
  const [searchInput, setSearchInput] = useState("");
  const mapRef = useRef(null);

  const reverseGeocode = async (lat, lng) => {
    if (!window.google?.maps?.Geocoder) return "Ubicacion seleccionada";
    const geocoder = new window.google.maps.Geocoder();
    try {
      const response = await geocoder.geocode({ location: { lat, lng } });
      return response.results?.[0]?.formatted_address || "Ubicacion seleccionada";
    } catch (error) {
      return "Ubicacion seleccionada";
    }
  };

  useEffect(() => {
    if (navigator.geolocation && isLoaded && !pickupLocation && !userLocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(loc);
          setMapCenter(loc);
          const address = await reverseGeocode(loc.lat, loc.lng);
          onPickupChange(loc, address);
        },
        (error) => {
          console.error("Error ubicacion:", error);
          if (!pickupLocation && window.google?.maps?.Geocoder) {
            const loc = { lat: 3.4516, lng: -76.532 };
            setMapCenter(loc);
          }
        },
        { enableHighAccuracy: true }
      );
    }
  }, [isLoaded]);

  useEffect(() => {
    if (pickupLocation && dropoffLocation) {
      calculateRoute(pickupLocation, dropoffLocation);
    } else {
      setDirections(null);
    }
  }, [pickupLocation, dropoffLocation]);

  const calculateRoute = useCallback((origin, destination) => {
    if (!window.google?.maps?.DirectionsService) return;
    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: new window.google.maps.LatLng(origin.lat, origin.lng),
        destination: new window.google.maps.LatLng(destination.lat, destination.lng),
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === "OK" && result) {
          setDirections(result);
          const leg = result.routes[0].legs[0];
          onDistanceChange?.({
            distance: leg.distance.value / 1000,
            duration: Math.round(leg.duration.value / 60),
          });
        }
      }
    );
  }, [onDistanceChange]);

  const handleMapClick = useCallback(async (e) => {
    if (!e?.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const location = { lat, lng };
    const address = await reverseGeocode(lat, lng);

    if (!pickupLocation) {
      onPickupChange(location, address);
    } else {
      onDropoffChange(location, address);
    }
  }, [pickupLocation, onPickupChange, onDropoffChange]);

  const handleSearch = useCallback(async () => {
    if (!searchInput.trim() || !window.google?.maps?.Geocoder) return;
    const geocoder = new window.google.maps.Geocoder();
    try {
      const response = await geocoder.geocode({ address: searchInput });
      if (response.results?.[0]) {
        const location = {
          lat: response.results[0].geometry.location.lat(),
          lng: response.results[0].geometry.location.lng(),
        };
        setMapCenter(location);
        if (!pickupLocation) {
          onPickupChange(location, response.results[0].formatted_address);
        } else {
          onDropoffChange(location, response.results[0].formatted_address);
        }
        setSearchInput("");
      }
    } catch (err) { console.error(err); }
  }, [searchInput, pickupLocation, onPickupChange, onDropoffChange]);

  const handleMyLocation = useCallback(() => {
    if (navigator.geolocation && userLocation) {
      setMapCenter(userLocation);
      if (!pickupLocation) onPickupChange(userLocation, "Mi ubicacion");
    }
  }, [userLocation, pickupLocation, onPickupChange]);

  const onMapLoad = useCallback((map) => { mapRef.current = map; }, []);

  const getStatusMessage = () => {
    if (!pickupLocation) return "👆 Haz click en el mapa para seleccionar la recogida";
    if (!dropoffLocation) return "👆 Haz click en el mapa para seleccionar el destino";
    return "✅ Ruta calculada. Haz click para cambiar el destino";
  };

  if (loadError) return <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>Error al cargar mapa</div>;
  if (!isLoaded) return <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>Cargando mapa...</div>;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      <div style={{ position: "absolute", top: 10, left: 10, right: 10, zIndex: 10, display: "flex", gap: 8 }}>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Buscar direccion..."
          style={{ padding: "10px 14px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, flex: 1, boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}
        />
        <button onClick={handleSearch} style={{ padding: "10px 16px", background: "#000", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>Buscar</button>
        <button onClick={handleMyLocation} style={{ padding: "10px 14px", background: "white", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontSize: 18, boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }} title="Mi ubicacion">📍</button>
      </div>

      <div style={{ position: "absolute", bottom: 10, left: 10, right: 10, zIndex: 10, background: "rgba(255,255,255,0.95)", padding: 12, borderRadius: 8, boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
        <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{getStatusMessage()}</p>
      </div>

      <GoogleMap mapContainerStyle={mapContainerStyle} zoom={zoom} center={mapCenter} options={defaultOptions} onLoad={onMapLoad} onClick={handleMapClick}>
        {userLocation && <Marker position={userLocation} icon={{ url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="8" fill="#4285F4" stroke="white" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="white"/></svg>'), scaledSize: new window.google.maps.Size(24, 24) }} />}

        {pickupLocation && <Marker position={pickupLocation} icon={{ url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect x="0" y="0" width="32" height="32" rx="16" fill="#276ef1"/><text x="16" y="22" text-anchor="middle" font-size="16" font-weight="bold" fill="white">A</text></svg>'), scaledSize: new window.google.maps.Size(32, 32) }} />}

        {dropoffLocation && <Marker position={dropoffLocation} icon={{ url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect x="0" y="0" width="32" height="32" rx="16" fill="#000"/><text x="16" y="22" text-anchor="middle" font-size="16" font-weight="bold" fill="white">B</text></svg>'), scaledSize: new window.google.maps.Size(32, 32) }} />}

        {driverLocation && <Marker position={driverLocation} icon={{ url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><circle cx="18" cy="18" r="16" fill="#00c853" stroke="white" stroke-width="2"/><text x="18" y="24" text-anchor="middle" font-size="18">🚗</text></svg>'), scaledSize: new window.google.maps.Size(36, 36) }} />}

        {directions && <DirectionsRenderer directions={directions} />}
      </GoogleMap>
    </div>
  );
};

export default GoogleMapComponent;
