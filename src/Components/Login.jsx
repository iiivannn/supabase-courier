import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "./styles.css";
import login_img from "../assets/login_bg.jpeg";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email) {
      setError("Email is required");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else {
      console.log(`User logged in: ${user.user_metadata.username}`);
      navigate("/");
    }
  };

  return (
    <div className="login-container">
      <div className="login-form-container">
        <div className="login-form">
          <div className="login_content">
            <h2>Login</h2>
            {error && <p className="login_error">{error}</p>}
            <div className="login_input_fields">
              <input
                type="email"
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)}
                className="login_input"
              />
              <input
                type="password"
                placeholder="Password"
                onChange={(e) => setPassword(e.target.value)}
                className="login_input"
              />
            </div>
          </div>
          <button onClick={handleLogin} className="login-button">
            Login
          </button>
        </div>
      </div>
      <div className="login-image-container">
        <img className="login_img" src={login_img} alt="Login Image" />
      </div>
    </div>
  );
}
