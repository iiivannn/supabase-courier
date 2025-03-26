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
  const [parcelDetected, setParcelDetected] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [timer, setTimer] = useState(15);

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

    return () => {
      supabase.removeChannel(subscription);
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

  // Open the solenoid lock for 15 seconds
  const openSolenoidLock = async () => {
    try {
      const response = await fetch(
        "http://<YOUR_RASPBERRY_PI_IP>:5000/open-lock",
        {
          method: "POST",
        }
      );
      const result = await response.json();
      if (result.status === "success") {
        setLockOpen(true);
        startTimer();
      } else {
        console.error("Failed to open lock:", result.message);
      }
    } catch (error) {
      console.error("Error opening lock:", error);
    }
  };

  // Start a 15-second timer
  const startTimer = () => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev === 0) {
          clearInterval(interval);
          setLockOpen(false);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Check if a parcel is detected
  const checkParcel = async () => {
    try {
      const response = await fetch(
        "http://<YOUR_RASPBERRY_PI_IP>:5000/check-parcel"
      );
      const result = await response.json();
      if (result.status === "success") {
        setParcelDetected(result.parcel_detected);
      } else {
        console.error("Failed to check parcel:", result.message);
      }
    } catch (error) {
      console.error("Error checking parcel:", error);
    }
  };

  // Handle parcel placement confirmation
  const handleParcelPlaced = () => {
    if (parcelDetected) {
      navigate("/closed"); // Navigate to the next page
    } else {
      alert(
        "No parcel detected. Please place the parcel inside the compartment."
      );
    }
  };

  return (
    <div className="box">
      <CheckLogout deviceId={selectedDevice} />
      <div className="wrapper">
        <div className="content_wrapper">
          <img className="logo" src={logo} alt="ParSafe Logo" />
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

          <div className="instructions">
            <p>Instructions</p>
            <ul>
              <li>Scan Complete.</li>
              <li>Confirmation Approved.</li>
              <li>Please open the door and place the parcel inside.</li>
              <li>Close it afterwards.</li>
              <li>Press &apos;Continue&apos;</li>
            </ul>
          </div>

          {!lockOpen ? (
            <button className="btn" onClick={openSolenoidLock}>
              Open Compartment
            </button>
          ) : (
            <div>
              <p>Compartment open for {timer} seconds...</p>
              <button className="btn" onClick={checkParcel}>
                Check Parcel
              </button>
              <button className="btn" onClick={handleParcelPlaced}>
                Parcel Placed
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
