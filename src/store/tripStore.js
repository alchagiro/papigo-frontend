import { create } from "zustand";
import { api } from "../store/authStore";

export const useTripStore = create((set, get) => ({
  trips: [],
  currentTrip: null,
  fareEstimate: null,

  requestTrip: async (tripData) => {
    const response = await api.post("/trips/request", tripData);
    set({ currentTrip: response.data });
    return response.data;
  },

  acceptTrip: async (tripId) => {
    await api.post(`/trips/accept/${tripId}`);
  },

  startTrip: async (tripId) => {
    await api.post(`/trips/start/${tripId}`);
  },

  completeTrip: async (tripId, data) => {
    await api.post(`/trips/complete/${tripId}`, data);
  },

  cancelTrip: async (tripId) => {
    const response = await api.post(`/trips/cancel/${tripId}`);
    return response;
  },

  calculateFare: async (pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType = "car") => {
    const response = await api.get("/trips/calculate-fare", {
      params: { pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType },
    });
    set({ fareEstimate: response.data });
    return response.data;
  },

  fetchTripHistory: async () => {
    const response = await api.get("/trips/history");
    set({ trips: response.data });
    return response.data;
  },

  getTripDetails: async (tripId) => {
    const response = await api.get(`/trips/${tripId}`);
    set({ currentTrip: response.data });
    return response.data;
  },

  applyBonus: async (tripId, bonusId) => {
    await api.post(`/trips/${tripId}/apply-bonus`, { bonusId });
  },

  clearCurrentTrip: () => set({ currentTrip: null, fareEstimate: null }),
}));
