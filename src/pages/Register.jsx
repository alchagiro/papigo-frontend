import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import appConfig from "../config/appConfig";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("passenger");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((state) => state.register);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name || !email || !phone || !password) {
      setError("Todos los campos son obligatorios");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const result = await register(name, email, phone, password, role);
      
      // Si es conductor, mostrar mensaje de pendiente y NO redirigir
      if (role === 'driver' && result.pendingApproval) {
        setError("");
        alert("Registro exitoso! Tu cuenta de conductor esta pendiente de aprobacion. El administrador revisara tu solicitud.");
        navigate("/login");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "80px",
            height: "80px",
            borderRadius: "20px",
            background: "linear-gradient(135deg, #00ab67 0%, #000000 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 8px 24px rgba(0, 171, 103, 0.4)",
            animation: "float 3s ease-in-out infinite"
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M5 17h14M5 17c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2M5 17c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2M19 17c0 1.1.9 2 2 2s2-.9 2-2-.9-2-2-2-2M7 9l2-3h6l2 3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h1>Crear Cuenta</h1>
          <p className="subtitle">Unete a {appConfig.name}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Nombre completo</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ingresa tu nombre"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Correo electronico</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ingresa tu correo"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Telefono</label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ingresa tu telefono"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Crea una contraseña"
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar contraseña</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirma tu contraseña"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Tipo de cuenta</label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="passenger">Pasajero</option>
              <option value="driver">Conductor</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Creando cuenta..." : "Registrarse"}
          </button>
        </form>

        <p className="auth-link">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesion</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
