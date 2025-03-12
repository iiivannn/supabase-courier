import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabase";

export default function CheckLogout({ deviceId }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!deviceId) return;

    const subscription = supabase
      .channel("unit_devices")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "unit_devices",
          filter: `device_id=eq.${deviceId}`,
        },
        (payload) => {
          if (payload.new.isLogout) {
            navigate("/"); // Redirect to login page
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [deviceId, navigate]);

  return null;
}
