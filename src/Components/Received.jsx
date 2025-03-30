/* eslint-disable react-hooks/exhaustive-deps */
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import "./styles.css";
import logo from "../assets/parsafe_logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCamera } from "@fortawesome/free-solid-svg-icons";
import CheckLogout from "./logout/checkLogout";

export default function Received() {
  const navigate = useNavigate();
  const [deviceUsername, setDeviceUsername] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [countdown, setCountdown] = useState(20); // Countdown starts at 20 seconds

  const selectedDevice = localStorage.getItem("selectedDevice");

  // Inactivity timer setup
  const [inactivityTimer, setInactivityTimer] = useState(null);

  useEffect(() => {
    if (!selectedDevice) {
      navigate("/");
      return;
    }

    const subscription = supabase
      .channel("unit_devices_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "unit_devices",
          filter: `device_id=eq.${selectedDevice}`,
        },
        (payload) => {
          console.log("Change received!", payload);
          checkDeviceUser(selectedDevice);
        }
      )
      .subscribe();

    checkDeviceUser(selectedDevice);

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedDevice, navigate]);

  // Function to check device user
  async function checkDeviceUser(deviceId) {
    try {
      const { data, error } = await supabase
        .from("unit_devices")
        .select("username")
        .eq("device_id", deviceId)
        .single();

      if (error) {
        console.error("Error checking device user:", error.message);
        setDeviceUsername(null);
      } else if (data && data.username) {
        setDeviceUsername(data.username);
        setShowSuccess(true);
      } else {
        setDeviceUsername(null);
      }
    } catch (err) {
      console.error("Error checking device user:", err.message);
      setDeviceUsername(null);
    } finally {
      setLoading(false);
    }
  }

  // Function to reset the inactivity timer
  const resetInactivityTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    setCountdown(20); // Reset countdown to 20 seconds
    const newTimer = setTimeout(() => {
      navigate("/scan"); // Redirect to /scan after 20 seconds of inactivity
    }, 20000); // 20 seconds
    setInactivityTimer(newTimer);
  };

  // Effect to handle user activity
  useEffect(() => {
    // Add event listeners for user activity
    const events = ["mousemove", "mousedown", "keypress", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer);
    });

    // Initialize the timer
    resetInactivityTimer();

    // Start the countdown interval
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    // Cleanup event listeners, timer, and interval
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer);
      });
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      clearInterval(countdownInterval);
    };
  }, []);

  return (
    <div className="box">
      <CheckLogout deviceId={selectedDevice} />
      <div className="wrapper">
        <div className="content_wrapper">
          <img className="logo" src={logo} alt="ParSafe Logo" />
          <div className="title">
            <p>Thank you for using ParSafe!</p>
          </div>

          <div className="get_user">
            <p>Device ID: {selectedDevice}</p>
            <p>
              ParSafe User:{" "}
              {loading
                ? "Loading..."
                : deviceUsername || "No user associated with selected device"}
            </p>
          </div>

          {showSuccess && (
            <div className="received-wrapper">
              <p className="success-animation">Parcel Received!</p>
            </div>
          )}

          <div className="instructions">
            <p>Instructions</p>
            <p>
              <FontAwesomeIcon icon={faCamera} className="camera-icon" />
            </p>
            <ul>
              <li>Please take a picture of the enclosed ParSafe!</li>
            </ul>
          </div>

          {/* Countdown Timer */}
          <div className="countdown-timer">
            <p>Redirecting to Scan in: {countdown} seconds</p>
          </div>

          <div className="buttons">
            <button className="btn" onClick={() => navigate("/start")}>
              Exit
            </button>
            <button className="btn" onClick={() => navigate("/scan")}>
              Deliver Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
