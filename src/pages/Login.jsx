import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import appConfig from "../config/appConfig";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const errorType = searchParams.get("error");
    if (errorType === "suspended") {
      setError("Tu cuenta ha sido suspendida. Contacta al administrador.");
    } else if (errorType === "pending") {
      setError("Tu cuenta esta pendiente de aprobacion por el administrador.");
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Error al iniciar sesion");
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
              <path d="M5 17h14M5 17c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2M5 17c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2M19 17c0 1.1.9 2 2 2s2-.9 2-2-.9-2-2-2-2-2M7 9l2-3h6l2 3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h1>{appConfig.name}</h1>
          <p className="subtitle">{appConfig.slogan}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
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
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Iniciando sesion..." : "Iniciar Sesion"}
          </button>
        </form>

        <p className="auth-link">
          ¿No tienes cuenta? <Link to="/register">Registrate</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
