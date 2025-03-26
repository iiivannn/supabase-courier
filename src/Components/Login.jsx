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
  const [addDeviceUsed, setAddDeviceUsed] = useState(false);
  const navigate = useNavigate();

  // Fetch available device IDs on component mount
  useEffect(() => {
    async function fetchDevices() {
      try {
        const { data, error } = await supabase
          .from("unit_devices")
          .select("device_id, user_id, username, isOccupied");
        if (error) throw error;

        // Filter devices based on the new isOccupied logic
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

  // Set up real-time subscription for changes to unit_devices table
  useEffect(() => {
    if (!selectedDevice || selectedDevice === "add_new") return;

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
      subscription.unsubscribe();
    };
  }, [selectedDevice]);

  // Check if the selected device has an associated user
  async function checkDeviceUser(deviceId) {
    if (deviceId === "add_new") return;

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
        // Get user details from auth.users
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

  // Handle device selection change
  const handleDeviceChange = async (e) => {
    const value = e.target.value;

    if (value === "add_new") {
      if (addDeviceUsed) {
        setError("You can only add one device per login session");
        return;
      }

      try {
        setLoading(true);

        // Get all existing device_ids to determine the next unit number
        const { data, error } = await supabase
          .from("unit_devices")
          .select("device_id");

        if (error) throw error;

        // Find the highest unit number
        let highestUnit = 0;
        data.forEach((device) => {
          if (device.device_id.startsWith("unit")) {
            const unitNumber = parseInt(
              device.device_id.replace("unit", ""),
              10
            );
            if (!isNaN(unitNumber) && unitNumber > highestUnit) {
              highestUnit = unitNumber;
            }
          }
        });

        // Create new device_id
        const newDeviceId = `unit${highestUnit + 1}`;

        // Add the new device to the database
        const { error: insertError } = await supabase
          .from("unit_devices")
          .insert({ device_id: newDeviceId, user_id: null, username: null });

        if (insertError) throw insertError;

        // Update local state
        setDevices([...devices, newDeviceId]);
        setSelectedDevice(newDeviceId);
        setAddDeviceUsed(true);
        setLoading(false);

        console.log(`Created new device: ${newDeviceId}`);
      } catch (err) {
        console.error("Error adding new device:", err.message);
        setError("Failed to add new device");
        setLoading(false);
      }
    } else {
      setSelectedDevice(value);
    }
  };

  // Handle login button click
  const handleLogin = async () => {
    if (!selectedDevice || selectedDevice === "add_new") {
      setError("Please select a device");
      return;
    }

    try {
      // Update the isOccupied column to true for the selected device
      const { error } = await supabase
        .from("unit_devices")
        .update({ isOccupied: true })
        .eq("device_id", selectedDevice);

      if (error) throw error;

      // Store selected device in localStorage for use in other components
      localStorage.setItem("selectedDevice", selectedDevice);

      // Navigate to start page
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
            <option value="add_new" disabled={addDeviceUsed}>
              + Add new device
            </option>
          </select>
        </div>

        {selectedDevice && selectedDevice !== "add_new" && !username && (
          <div className="device-status">
            <p>Listening for user association changes...</p>
          </div>
        )}

        <button
          className="login-button"
          onClick={handleLogin}
          disabled={!selectedDevice || selectedDevice === "add_new"}
        >
          Login
        </button>
      </div>
    </div>
  );
}
