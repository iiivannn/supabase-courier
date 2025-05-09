import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabase";
import Loading from "../loading/loading";
import "./styles.css";
import logo from "../assets/parsafe_logo.png";

import CheckLogout from "./logout/checkLogout";

export default function ClosedVerify() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      navigate("/received");
    }, 12000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const [deviceUsername, setDeviceUsername] = useState(null);
  const [loading, setLoading] = useState(true);

  const selectedDevice = localStorage.getItem("selectedDevice");

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
        <div className="content_wrapper">
          <img className="logo" src={logo} alt="ParSafe Logo" />
          <div className="title">
            <p>Welcome to ParSafe!</p>
          </div>
          <div className="get_user">
            <p>{selectedDevice}</p>
            <p>
              ParSafe User:{" "}
              {loading
                ? "Loading..."
                : deviceUsername || "No user associated with selected device"}
            </p>
          </div>

          <div className="loading">
            {isLoading ? (
              <>
                <p>Parcel being processed. Please wait.</p>
                <div className="loading-animation">
                  <Loading /> {/* Show loading animation */}
                </div>
              </>
            ) : (
              <button onClick={() => navigate("/received")}>Finish</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
