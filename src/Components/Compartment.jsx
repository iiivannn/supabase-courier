import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "./styles.css";
import logo from "../assets/parsafe_logo.png";
import CheckLogout from "./logout/checkLogout";

export default function CompartmentPage() {
  const navigate = useNavigate();
  const [deviceUsername, setDeviceUsername] = useState(null);
  const [loading, setLoading] = useState(true);
  const [compartmentStatus, setCompartmentStatus] = useState("locked"); // "locked", "opening", "open", "detecting", "closing"
  const [detectionCountdown, setDetectionCountdown] = useState(0);

  // Get the selected device from localStorage
  const selectedDevice = localStorage.getItem("selectedDevice");

  // Set up real-time subscription for changes to unit_devices table
  useEffect(() => {
    if (!selectedDevice) {
      navigate("/");
      return;
    }

    // Subscribe to changes for the selected device
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

    // Check for existing user when device is selected
    checkDeviceUser(selectedDevice);

    // Automatically open the solenoid lock when component loads
    openSolenoidLock();

    // Start interval for checking parcel detection
    const parcelCheckInterval = setInterval(checkParcel, 1000);

    return () => {
      supabase.removeChannel(subscription);
      clearInterval(parcelCheckInterval);
    };
  }, [selectedDevice, navigate]);

  // Check if the selected device has an associated user
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

  // Open the solenoid lock
  const openSolenoidLock = async () => {
    try {
      setCompartmentStatus("opening");
      const response = await fetch("http://127.0.0.1:5000/open-lock", {
        method: "POST",
      });
      const result = await response.json();
      if (result.status === "success") {
        setCompartmentStatus("open");
      } else {
        console.error("Failed to open lock:", result.message);
        setCompartmentStatus("locked");
      }
    } catch (error) {
      console.error("Error opening lock:", error);
      setCompartmentStatus("locked");
    }
  };

  // Check if a parcel is detected
  const checkParcel = async () => {
    try {
      // Only check for parcel if compartment is open
      if (compartmentStatus !== "open" && compartmentStatus !== "detecting") {
        return;
      }
      
      const response = await fetch("http://127.0.0.1:5000/check-parcel");
      const result = await response.json();
      
      if (result.status === "success" && result.parcel_detected) {
        // If parcel is detected, start or continue the countdown
        if (compartmentStatus !== "detecting") {
          setCompartmentStatus("detecting");
          setDetectionCountdown(2); // Start 2 second countdown
        } else if (detectionCountdown > 0) {
          setDetectionCountdown(prev => prev - 1);
        } else {
          // After 2 seconds of continuous detection, move to closing state and proceed
          setCompartmentStatus("closing");
          setTimeout(() => {
            navigate("/closed"); // Navigate to the next page after showing closing animation
          }, 1500); // Give time for the closing animation to play
        }
      } else if (compartmentStatus === "detecting") {
        // Reset if detection is interrupted
        setCompartmentStatus("open");
        setDetectionCountdown(0);
      }
    } catch (error) {
      console.error("Error checking parcel:", error);
    }
  };

  // Render different instruction text based on compartment status
  const renderInstructions = () => {
    switch (compartmentStatus) {
      case "locked":
        return "Preparing compartment...";
      case "opening":
        return "Opening compartment...";
      case "open":
        return "Please place your parcel inside the compartment.";
      case "detecting":
        return `Parcel detected! Confirming placement... (${detectionCountdown}s)`;
      case "closing":
        return "Parcel confirmed. Securing compartment...";
      default:
        return "Please wait...";
    }
  };

  return (
    <div className="box">
      <CheckLogout deviceId={selectedDevice} />
      <div className="wrapper">
        <img src={logo} alt="ParSafe Logo" />
        <div className="content_wrapper">
          <div className="title">
            <p>Welcome to ParSafe</p>
            <p>Your Smart Parcel Receiver</p>
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

          {/* <div className="instructions">
            <p>Instructions</p>
            <ul>
            
            </ul>
          </div> */}

          <div className="compartment-status">
            <p className="status-text">{renderInstructions()}</p>
            
            {/* Animated arrow pointing up when compartment is open */}
            {compartmentStatus === "open" && (
              <div className="arrow-container">
                <div className="arrow-up">
                  <span>↑</span>
                </div>
              </div>
            )}
            
            {/* Status indicator */}
            <div className={`status-indicator ${compartmentStatus}`}>
              <span className="indicator-label">
                {compartmentStatus === "locked" && "LOCKED"}
                {compartmentStatus === "opening" && "OPENING"}
                {compartmentStatus === "open" && "OPEN"}
                {compartmentStatus === "detecting" && "DETECTING"}
                {compartmentStatus === "closing" && "LOCKING"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}