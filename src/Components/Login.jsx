/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useNavigate } from "react-router-dom";
import "./styles.css";

export default function Login() {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [username, setUsername] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchDevices() {
      try {
        const { data, error } = await supabase
          .from("unit_devices")
          .select("device_id, user_id, username, isOccupied");
        if (error) throw error;

        const filteredDevices = data.filter(
          (item) => !(item.user_id && item.username && item.isOccupied)
        );

        setDevices(filteredDevices.map((item) => item.device_id));
        setLoading(false);
      } catch (err) {
        console.error("Error fetching devices:", err.message);
        setError("Failed to load devices");
        setLoading(false);
      }
    }

    fetchDevices();
  }, []);

  useEffect(() => {
    if (!selectedDevice) return;

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
      subscription.unsubscribe();
    };
  }, [selectedDevice]);

  async function checkDeviceUser(deviceId) {
    try {
      const { data, error } = await supabase
        .from("unit_devices")
        .select("user_id")
        .eq("device_id", deviceId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "Results contain 0 rows" - not an error for our case
        throw error;
      }

      if (data && data.user_id) {
        const { data: userData, error: userError } =
          await supabase.auth.admin.getUserById(data.user_id);

        if (userError) throw userError;

        setUsername(userData?.user?.user_metadata?.username || "Unknown user");
        console.log(
          `Device ${deviceId} is associated with username: ${
            userData?.user?.user_metadata?.username || "Unknown user"
          }`
        );
      } else {
        setUsername(null);
        console.log(
          `Device ${deviceId} has no associated user. Listening for changes...`
        );
      }
    } catch (err) {
      console.error("Error checking device user:", err.message);
      setError("Failed to check device user");
    }
  }

  const handleDeviceChange = (e) => {
    setSelectedDevice(e.target.value);
  };

  const handleLogin = async () => {
    if (!selectedDevice) {
      setError("Please select a device");
      return;
    }

    try {
      const { error } = await supabase
        .from("unit_devices")
        .update({ isOccupied: true })
        .eq("device_id", selectedDevice);

      if (error) throw error;

      localStorage.setItem("selectedDevice", selectedDevice);

      navigate("/start");
    } catch (err) {
      console.error("Error updating device status:", err.message);
      setError("Failed to update device status");
    }
  };

  if (loading) {
    return <div className="device-selector-container">Loading devices...</div>;
  }

  return (
    <div className="device-selector-container">
      <div className="device-selector-form">
        <h2>Select Device</h2>
        {/* {error && <p className="device-error">{error}</p>} */}

        <div className="device-dropdown">
          <select
            value={selectedDevice}
            onChange={handleDeviceChange}
            className="device-select"
          >
            <option value="" disabled>
              -- Select a device --
            </option>
            {devices.map((deviceId) => (
              <option key={deviceId} value={deviceId}>
                {deviceId}
              </option>
            ))}
          </select>
        </div>

        {selectedDevice && !username && (
          <div className="device-status">
            <p>Listening for user association changes...</p>
          </div>
        )}

        <button
          className="login-button"
          onClick={handleLogin}
          disabled={!selectedDevice}
        >
          Login
        </button>
      </div>
    </div>
  );
}
