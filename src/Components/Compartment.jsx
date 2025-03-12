import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import "./styles.css";
import logo from "../assets/parsafe_logo.png";

import CheckLogout from "./logout/checkLogout";

export default function StartPage() {
  const navigate = useNavigate();
  const [deviceUsername, setDeviceUsername] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get the selected device from localStorage
  const selectedDevice = localStorage.getItem("selectedDevice");

  // Set up real-time subscription for changes to unit_devices table
  useEffect(() => {
    if (!selectedDevice) {
      navigate("/login");
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

          <button className="btn" onClick={() => navigate("/closed")}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
