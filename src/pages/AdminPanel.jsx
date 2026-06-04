import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { api } from "../store/authStore";
import appConfig from "../config/appConfig";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

const AdminPanel = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("debts");
  const [debts, setDebts] = useState([]);
  const [passengers, setPassengers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resettingId, setResettingId] = useState(null);
  const [editingNotes, setEditingNotes] = useState(null);

  const [bonusAmount, setBonusAmount] = useState("");
  const [bonusDesc, setBonusDesc] = useState("");
  const [selectedPassengerId, setSelectedPassengerId] = useState("");
  const [givingBonus, setGivingBonus] = useState(false);

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("passenger");
  const [creatingUser, setCreatingUser] = useState(false);

  const [showActivateModal, setShowActivateModal] = useState(false);
  const [driverToActivate, setDriverToActivate] = useState(null);
  const [activationVehicleType, setActivationVehicleType] = useState("car");

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const COLORS = ["#00ab67", "#1a73e8", "#f9ab00", "#d93025", "#9333ea"];

  useEffect(() => {
    if (activeTab === "debts") fetchDebts();
    else if (activeTab === "passengers") fetchPassengers();
    else if (activeTab === "drivers") fetchDrivers();
    else if (activeTab === "bonuses") fetchPassengersForBonus();
    else if (activeTab === "dashboard") fetchStats();
  }, [activeTab]);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const response = await api.get("/admin/stats/dashboard");
      setStats(response.data);
    } catch (err) { console.error("Error al obtener estadisticas"); }
    finally { setStatsLoading(false); }
  };

  const fetchDebts = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/debts");
      setDebts(response.data);
    } catch (err) { console.error("Error al obtener deudas"); }
    finally { setLoading(false); }
  };

  const fetchPassengers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/users?role=passenger");
      setPassengers(response.data);
    } catch (err) { console.error("Error al obtener pasajeros"); }
    finally { setLoading(false); }
  };

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/users?role=driver");
      setDrivers(response.data);
    } catch (err) { console.error("Error al obtener conductores"); }
    finally { setLoading(false); }
  };

  const handleActivateDriver = (userId) => {
    setDriverToActivate(userId);
    setActivationVehicleType("car");
    setShowActivateModal(true);
  };

  const confirmActivateDriver = async () => {
    try {
      await api.post("/admin/users/activate-driver", { 
        userId: driverToActivate,
        vehicleType: activationVehicleType 
      });
      alert("Conductor activado exitosamente");
      setShowActivateModal(false);
      fetchDrivers();
    } catch (err) { 
      alert("Error al activar conductor: " + (err.response?.data?.error || err.message)); 
    }
  };

  const fetchPassengersForBonus = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/users?role=passenger");
      setPassengers(response.data);
    } catch (err) { console.error("Error al obtener pasajeros"); }
    finally { setLoading(false); }
  };

  const handleAction = async (action, userId, reason) => {
    try {
      await api.post(`/admin/users/${action}`, { userId, reason });
      if (activeTab === "passengers") fetchPassengers();
      else if (activeTab === "drivers") fetchDrivers();
    } catch (err) {
      console.error("Error en accion de usuario:", err.response?.data?.error || err.message);
      alert("Error: " + (err.response?.data?.error || err.message));
    }
  };

  const handleGiveBonus = async () => {
    if (!selectedPassengerId || !bonusAmount) return;
    setGivingBonus(true);
    try {
      await api.post("/admin/bonuses", {
        passengerId: selectedPassengerId,
        amount: parseFloat(bonusAmount),
        description: bonusDesc
      });
      setBonusAmount("");
      setBonusDesc("");
      alert("Bono otorgado correctamente");
    } catch (err) { alert("Error al dar bono"); }
    finally { setGivingBonus(false); }
  };

  const handleCreateUser = async () => {
    if (!newUserName || !newUserEmail || !newUserPassword) {
      alert("Nombre, email y contraseña son obligatorios");
      return;
    }
    
    setCreatingUser(true);
    try {
      await api.post("/admin/users/create", {
        name: newUserName,
        email: newUserEmail,
        phone: newUserPhone,
        password: newUserPassword,
        role: newUserRole
      });
      
      alert("Usuario creado exitosamente");
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPhone("");
      setNewUserPassword("");
      setNewUserRole("passenger");
      
      // Refrescar lista si estamos en la pestaña correspondiente
      if (newUserRole === "passenger") fetchPassengers();
      else if (newUserRole === "driver") fetchDrivers();
    } catch (err) {
      alert("Error al crear usuario: " + (err.response?.data?.error || err.message));
    } finally {
      setCreatingUser(false);
    }
  };

  const handleResetDebt = async (driverId) => {
    try {
      setResettingId(driverId);
      await api.post("/admin/debt/reset", { driverId, notes: "Pago recibido - reiniciado por admin" });
      await fetchDebts();
      setResettingId(null);
    } catch (err) { console.error("Error al reiniciar deuda"); setResettingId(null); }
  };

  const handleUpdateDebt = async (driverId, amount) => {
    try {
      await api.post("/admin/debt/update", { driverId, amount: parseFloat(amount), notes: editingNotes || "Ajuste manual" });
      await fetchDebts();
      setEditingNotes(null);
    } catch (err) { console.error("Error al actualizar deuda"); }
  };

  const handleLogout = () => { logout(); navigate("/login"); };

  const formatCOP = (amount) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(amount);

  if (!user || user.role !== "admin") { navigate("/"); return null; }

  const totalOwed = debts.reduce((sum, d) => sum + (d.amount_owed || 0), 0);

  return (
    <div>
      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img 
            src="/LogoV.png" 
            alt={appConfig.name} 
            style={{ height: "45px", width: "auto" }}
          />
        </div>
        <div className="header-actions">
          <span>Admin: {user?.name}</span>
          <button className="btn btn-secondary" onClick={handleLogout}>Salir</button>
        </div>
      </header>

      <div className="container">
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px", overflowX: "auto" }}>
          <button className={`btn ${activeTab === "dashboard" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("dashboard")}>Dashboard</button>
          <button className={`btn ${activeTab === "debts" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("debts")}>Deudas</button>
          <button className={`btn ${activeTab === "passengers" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("passengers")}>Pasajeros</button>
          <button className={`btn ${activeTab === "drivers" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("drivers")}>Conductores</button>
          <button className={`btn ${activeTab === "bonuses" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("bonuses")}>Bonos</button>
          <button className={`btn ${activeTab === "create-user" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("create-user")}>Crear Usuario</button>
        </div>

        {activeTab === "dashboard" && (
          <>
            {statsLoading ? (
              <div className="loading">Cargando estadisticas...</div>
            ) : stats && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                  <div style={{ background: "#e8f5e9", padding: "20px", borderRadius: "12px", borderLeft: "4px solid #00ab67" }}>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#00ab67" }}>{stats.totalTrips}</div>
                    <div style={{ fontSize: "14px", color: "#666" }}>Total Viajes</div>
                  </div>
                  <div style={{ background: "#e3f2fd", padding: "20px", borderRadius: "12px", borderLeft: "4px solid #1a73e8" }}>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#1a73e8" }}>{stats.todayTrips}</div>
                    <div style={{ fontSize: "14px", color: "#666" }}>Viajes Hoy</div>
                  </div>
                  <div style={{ background: "#fff3e0", padding: "20px", borderRadius: "12px", borderLeft: "4px solid #f9ab00" }}>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#e65100" }}>{formatCOP(stats.totalRevenue)}</div>
                    <div style={{ fontSize: "14px", color: "#666" }}>Ingresos Totales</div>
                  </div>
                  <div style={{ background: "#fce4ec", padding: "20px", borderRadius: "12px", borderLeft: "4px solid #d93025" }}>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#d93025" }}>{formatCOP(stats.totalDebt)}</div>
                    <div style={{ fontSize: "14px", color: "#666" }}>Deuda Total</div>
                  </div>
                  <div style={{ background: "#e8eaf6", padding: "20px", borderRadius: "12px", borderLeft: "4px solid #5c6bc0" }}>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#3f51b5" }}>{stats.totalUsers}</div>
                    <div style={{ fontSize: "14px", color: "#666" }}>Usuarios</div>
                  </div>
                  <div style={{ background: "#f3e5f5", padding: "20px", borderRadius: "12px", borderLeft: "4px solid #9333ea" }}>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#9333ea" }}>{stats.totalDrivers} / {stats.totalPassengers}</div>
                    <div style={{ fontSize: "14px", color: "#666" }}>Conductores / Pasajeros</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                  <div className="trip-card">
                    <h3 style={{ marginBottom: "16px" }}>Viajes Ultimos 7 Dias</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={stats.weeklyTrips}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip formatter={(value, name) => name === "trips" ? [`${value} viajes`, "Viajes"] : [formatCOP(value), "Ingresos"]} />
                        <Bar dataKey="trips" fill="#00ab67" name="Viajes" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="trip-card">
                    <h3 style={{ marginBottom: "16px" }}>Estado de Viajes</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={stats.tripsByStatus}
                          dataKey="count"
                          nameKey="status"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({name, percent}) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {stats.tripsByStatus.map((entry, index) => (
                            <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                  <div className="trip-card">
                    <h3 style={{ marginBottom: "16px" }}>Top 5 Conductores (Ganancias)</h3>
                    {stats.topDrivers.length === 0 ? (
                      <p style={{ textAlign: "center", color: "#666" }}>Sin datos</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart layout="vertical" data={stats.topDrivers}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatCOP(v)} />
                          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value) => [formatCOP(value), "Ganancias"]} />
                          <Bar dataKey="earnings" fill="#1a73e8" name="Ganancias" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="trip-card">
                    <h3 style={{ marginBottom: "16px" }}>Top 5 Pasajeros (Viajes)</h3>
                    {stats.topPassengers.length === 0 ? (
                      <p style={{ textAlign: "center", color: "#666" }}>Sin datos</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart layout="vertical" data={stats.topPassengers}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="trips" fill="#f9ab00" name="Viajes" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "debts" && (
          <>
            <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
              <div style={{ flex: 1, background: "#e8f0fe", padding: "20px", borderRadius: "12px" }}>
                <div style={{ fontSize: "28px", fontWeight: "700", color: "#1a73e8" }}>{formatCOP(totalOwed)}</div>
                <div>Total adeudado</div>
              </div>
            </div>
            {loading ? <div className="loading">Cargando...</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {debts.map(driver => (
                  <div key={driver.driver_id} className="trip-card">
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <h3>{driver.driver_name}</h3>
                        <p style={{ fontSize: "14px", color: "#666" }}>{driver.driver_email}</p>
                        <p style={{ fontSize: "14px", color: "#666" }}>Viajes completados: {driver.total_completed_trips || 0}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "20px", fontWeight: "700", color: driver.amount_owed > 0 ? "#d93025" : "#137333" }}>
                          {formatCOP(driver.amount_owed)}
                        </div>
                        <div style={{ fontSize: "12px", color: "#666" }}>Deuda actual</div>
                      </div>
                    </div>
                    <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                      <button className="btn btn-success" onClick={() => handleResetDebt(driver.driver_id)} disabled={resettingId === driver.driver_id}>
                        {resettingId === driver.driver_id ? "..." : "✓ Pago Total"}
                      </button>
                      <button className="btn btn-secondary" onClick={() => navigate(`/admin/user/${driver.driver_id}/trips`)}>
                        Ver Viajes
                      </button>
                    </div>
                    {driver.notes && (
                      <div style={{ marginTop: "8px", fontSize: "12px", color: "#666", fontStyle: "italic" }}>
                        Ultima nota: {driver.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "passengers" && (
          <>
            <h2>Pasajeros</h2>
            {loading ? <div className="loading">Cargando...</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {passengers.map(u => (
                  <div key={u.id} className="trip-card" style={{ opacity: u.is_suspended ? 0.6 : 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h3>{u.name}</h3>
                        <p style={{ fontSize: "14px", color: "#666" }}>📧 {u.email}</p>
                        <p style={{ fontSize: "14px", color: "#666" }}>📱 {u.phone || "No registrado"}</p>
                        <p style={{ fontSize: "14px", color: "#666" }}>📅 Registro: {u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A"}</p>
                        <p style={{ fontSize: "14px", color: "#666" }}>✅ Viajes completados como pasajero: {u.completed_trips_passenger || 0}</p>
                        <p style={{ fontSize: "14px", color: "#666" }}>📊 Total viajes como pasajero: {u.total_trips_passenger || 0}</p>
                        {u.is_suspended && <span style={{ color: "#d93025", fontWeight: "bold" }}>SUSPENDIDO</span>}
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button className="btn btn-secondary" onClick={() => navigate(`/admin/user/${u.id}/trips`)}>Ver Viajes</button>
                        {u.is_suspended ? (
                          <button className="btn btn-success" onClick={() => handleAction("reactivate", u.id)}>Reactivar</button>
                        ) : (
                          <button className="btn btn-secondary" onClick={() => handleAction("suspend", u.id, "Suspendido por admin")}>Suspender</button>
                        )}
                        <button className="btn" style={{ background: "#fee2e2", color: "#991b1b" }} onClick={() => handleAction("delete", u.id)}>Eliminar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "drivers" && (
          <>
            <h2>Conductores</h2>
            {loading ? <div className="loading">Cargando...</div> : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {drivers.map(u => (
                  <div key={u.id} className="trip-card" style={{ opacity: !u.is_active ? 0.8 : (u.is_suspended ? 0.6 : 1), border: !u.is_active ? "2px solid #f59e0b" : "none" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h3>{u.name} {!u.is_active && <span style={{ color: "#f59e0b", fontSize: "14px" }}>(PENDIENTE)</span>}</h3>
                        <p style={{ fontSize: "14px", color: "#666" }}>📧 {u.email}</p>
                        <p style={{ fontSize: "14px", color: "#666" }}>📱 {u.phone || "No registrado"}</p>
                        <p style={{ fontSize: "14px", color: "#666" }}>📅 Registro: {u.created_at ? new Date(u.created_at).toLocaleDateString() : "N/A"}</p>
                        <p style={{ fontSize: "14px", color: "#666" }}>
                          🚗 Vehículo: {u.vehicle_type === 'motorcycle' ? '🏍️ Moto' : '🚗 Carro'}
                        </p>
                        <p style={{ fontSize: "14px", color: "#666" }}>⭐ Calificación: {u.driver_rating ? Number(u.driver_rating).toFixed(1) : "Sin calificaciones"} ({u.total_ratings || 0} votos)</p>
                        <p style={{ fontSize: "14px", color: "#666" }}>✅ Viajes completados como conductor: {u.completed_trips || 0}</p>
                        <p style={{ fontSize: "14px", color: "#666" }}>📊 Total viajes como conductor: {u.total_trips || 0}</p>
                        {u.last_active && (
                          <p style={{ fontSize: "14px", color: "#666" }}>🕐 Última actividad: {new Date(u.last_active).toLocaleString()}</p>
                        )}
                        {!u.is_active && <span style={{ color: "#f59e0b", fontWeight: "bold" }}>PENDIENTE DE APROBACIÓN</span>}
                        {u.is_suspended && <span style={{ color: "#d93025", fontWeight: "bold" }}>SUSPENDIDO</span>}
                      </div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {!u.is_active && (
                          <button className="btn btn-success" onClick={() => handleActivateDriver(u.id)}>Activar Conductor</button>
                        )}
                        <button className="btn btn-secondary" onClick={() => navigate(`/admin/user/${u.id}/trips`)}>Ver Viajes</button>
                        {u.is_suspended ? (
                          <button className="btn btn-success" onClick={() => handleAction("reactivate", u.id)}>Reactivar</button>
                        ) : u.is_active && (
                          <button className="btn btn-secondary" onClick={() => handleAction("suspend", u.id, "Suspendido por admin")}>Suspender</button>
                        )}
                        <button className="btn" style={{ background: "#fee2e2", color: "#991b1b" }} onClick={() => handleAction("delete", u.id)}>Eliminar</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "bonuses" && (
          <div className="trip-card">
            <h2>Otorgar Bono a Pasajero</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <select value={selectedPassengerId} onChange={e => setSelectedPassengerId(e.target.value)} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ddd" }}>
                <option value="">Seleccionar Pasajero</option>
                {passengers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.email})</option>)}
              </select>
              <input type="number" placeholder="Valor del bono (COP)" value={bonusAmount} onChange={e => setBonusAmount(e.target.value)} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ddd" }} />
              <input type="text" placeholder="Descripcion (Opcional)" value={bonusDesc} onChange={e => setBonusDesc(e.target.value)} style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ddd" }} />
              <button className="btn btn-primary" onClick={handleGiveBonus} disabled={givingBonus}>
                {givingBonus ? "Otorgando..." : "Dar Bono"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "create-user" && (
          <div className="trip-card">
            <h2>Crear Nuevo Usuario</h2>
            <p style={{ color: "#666", marginBottom: "16px" }}>Solo los administradores pueden crear otros usuarios, incluyendo otros admins.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div className="form-group">
                <label>Nombre completo</label>
                <input 
                  type="text" 
                  placeholder="Nombre completo" 
                  value={newUserName} 
                  onChange={e => setNewUserName(e.target.value)}
                  required
                  style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ddd", width: "100%" }}
                />
              </div>
              <div className="form-group">
                <label>Correo electronico</label>
                <input 
                  type="email" 
                  placeholder="Correo electronico" 
                  value={newUserEmail} 
                  onChange={e => setNewUserEmail(e.target.value)}
                  required
                  style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ddd", width: "100%" }}
                />
              </div>
              <div className="form-group">
                <label>Telefono</label>
                <input 
                  type="tel" 
                  placeholder="Telefono (opcional)" 
                  value={newUserPhone} 
                  onChange={e => setNewUserPhone(e.target.value)}
                  style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ddd", width: "100%" }}
                />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input 
                  type="password" 
                  placeholder="Contraseña" 
                  value={newUserPassword} 
                  onChange={e => setNewUserPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ddd", width: "100%" }}
                />
              </div>
              <div className="form-group">
                <label>Tipo de cuenta</label>
                <select 
                  value={newUserRole} 
                  onChange={e => setNewUserRole(e.target.value)}
                  style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ddd", width: "100%" }}
                >
                  <option value="passenger">Pasajero</option>
                  <option value="driver">Conductor (requiere aprobacion)</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={handleCreateUser} 
                disabled={creatingUser}
                style={{ marginTop: "8px" }}
              >
                {creatingUser ? "Creando..." : "Crear Usuario"}
              </button>
            </div>
          </div>
        )}

        {/* Modal para activar conductor con tipo de vehiculo */}
        {showActivateModal && (
          <div className="modal-overlay" onClick={() => setShowActivateModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2>Activar Conductor</h2>
              <p style={{ color: "#666", marginBottom: "20px" }}>
                Selecciona el tipo de vehiculo que utilizara este conductor
              </p>
              <div className="form-group">
                <label>Tipo de Vehiculo</label>
                <select 
                  value={activationVehicleType} 
                  onChange={e => setActivationVehicleType(e.target.value)}
                  style={{ padding: "12px", borderRadius: "8px", border: "1px solid #ddd", width: "100%" }}
                >
                  <option value="car">Carro / Automovil</option>
                  <option value="motorcycle">Moto / Motocicleta</option>
                </select>
              </div>
              <div className="btn-group">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowActivateModal(false)}
                >
                  Cancelar
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={confirmActivateDriver}
                >
                  Activar Conductor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
