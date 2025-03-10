import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";

export default function LogoutModal({ isOpen, onClose, onLogout }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isDisabled, setIsDisabled] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (attempts >= 4) {
      setIsDisabled(true);
      setError(
        `Too many incorrect attempts. Try again after ${countdown} seconds.`
      );
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setAttempts(0);
            setIsDisabled(false);
            setError("");
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [attempts, countdown]);

  const handleLogout = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("No user is logged in");
      return;
    }

    // Try to reauthenticate the user by signing in again
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });

    if (authError) {
      setError("Incorrect password");
      setAttempts((prev) => prev + 1);
      setPassword("");
    } else {
      // If authentication is successful, log out
      await supabase.auth.signOut();
      onLogout();
      navigate("/login");
      // Reset input fields and state variables
      setPassword("");
      setError("");
      setAttempts(0);
      setIsDisabled(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <h2 className="confirm_logout">Confirm Logout</h2>
        {error && (
          <p className="logout_error" style={{ color: "red" }}>
            {error}
          </p>
        )}

        <div className="logout_content">
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isDisabled}
            className="logout_input"
          />
          <div className="logout_buttons">
            <button
              className="logout_btn"
              onClick={handleLogout}
              disabled={isDisabled || password === ""}
            >
              Logout
            </button>
            <button className="logout_btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
