/* eslint-disable no-unused-vars */
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import "./styles.css";
import logo from "../assets/parsafe_logo.png";
import CheckLogout from "./logout/checkLogout";

const STATUS = {
  LOCKED: "locked",
  OPENING: "opening",
  OPEN: "open",
  DETECTING: "detecting",
  CLOSING: "closing",
};

export default function CompartmentPage() {
  const navigate = useNavigate();
  const [deviceUsername, setDeviceUsername] = useState(null);
  const [loading, setLoading] = useState(true);
  const [compartmentStatus, setCompartmentStatus] = useState(STATUS.LOCKED);
  const [lastDetection, setLastDetection] = useState(null);

  const selectedDevice = localStorage.getItem("selectedDevice");

  const checkDeviceUser = useCallback(async (deviceId) => {
    try {
      const { data, error } = await supabase
        .from("unit_devices")
        .select("username")
        .eq("device_id", deviceId)
        .single();

      if (error) throw error;
      setDeviceUsername(data?.username || null);
    } catch (err) {
      console.error("Error checking device user:", err);
      setDeviceUsername(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const openSolenoidLock = useCallback(async () => {
    if (compartmentStatus !== STATUS.LOCKED) return;

    try {
      setCompartmentStatus(STATUS.OPENING);
      const response = await fetch("http://127.0.0.1:5000/open-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to open lock");

      const result = await response.json();
      if (result.status === "success" && result.lock_open) {
        setCompartmentStatus(STATUS.OPEN);
      }
    } catch (error) {
      console.error("Lock error:", error);
      setCompartmentStatus(STATUS.LOCKED);
    }
  }, [compartmentStatus]);

  const closeSolenoidLock = useCallback(async () => {
    try {
      setCompartmentStatus(STATUS.CLOSING);
      const response = await fetch("http://127.0.0.1:5000/close-lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to close lock");

      setTimeout(() => navigate("/closed"), 1000);
    } catch (error) {
      console.error("Lock error:", error);
    }
  }, [navigate]);

  const checkParcel = useCallback(async () => {
    try {
      if (compartmentStatus !== STATUS.OPEN) return;

      const response = await fetch("http://127.0.0.1:5000/check-parcel");
      if (!response.ok) throw new Error("Sensor check failed");

      const result = await response.json();
      setLastDetection(result);

      if (result.status === "success" && result.parcel_detected) {
        await closeSolenoidLock();
      }
    } catch (error) {
      console.error("Parcel check error:", error);
    }
  }, [compartmentStatus, closeSolenoidLock]);

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
          checkDeviceUser(selectedDevice);
        }
      )
      .subscribe();

    checkDeviceUser(selectedDevice);
    openSolenoidLock();

    const parcelCheckInterval = setInterval(checkParcel, 1000);
    return () => {
      supabase.removeChannel(subscription);
      clearInterval(parcelCheckInterval);
    };
  }, [
    selectedDevice,
    navigate,
    checkDeviceUser,
    openSolenoidLock,
    checkParcel,
  ]);

  const statusMessages = {
    [STATUS.LOCKED]: "Preparing compartment...",
    [STATUS.OPENING]: "Opening compartment...",
    [STATUS.OPEN]: "Please place your parcel inside the compartment.",
    [STATUS.CLOSING]: "Securing compartment...",
  };

  return (
    <div className="box">
      <CheckLogout deviceId={selectedDevice} />
      <div className="wrapper">
        <div className="content_wrapper">
          <img className="logo" src={logo} alt="ParSafe Logo" />
          <div className="title">
            <p>Welcome to ParSafe!</p>
          </div>

          <div className="get_user">
            <p>{selectedDevice}</p>
            <p>
              ParSafe User:{" "}
              {loading ? "Loading..." : deviceUsername || "No user associated"}
            </p>
          </div>

          <div className="compartment-status">
            <p className="status-text">
              {statusMessages[compartmentStatus] || "Please wait..."}
            </p>

            {compartmentStatus === STATUS.OPEN && (
              <div className="arrow-container">
                <div className="arrow-up">
                  <span>↑</span>
                </div>
              </div>
            )}

            <div className={`status-indicator ${compartmentStatus}`}>
              <span className="indicator-label">
                {compartmentStatus.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
