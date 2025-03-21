import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import logo from "../assets/parsafe_logo.png";
import Loading from "../loading/loading"; // Import the Loading component
import CheckLogout from "./logout/checkLogout";
import { useNavigate } from "react-router-dom";
import "./styles.css";

export default function ScanBarcode() {
  const navigate = useNavigate(); // For navigating between pages
  const [barcode, setBarcode] = useState("");
  const [message, setMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState("");
  const [deviceUsername, setDeviceUsername] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Handle barcode scanner input
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (isScanning) {
        setScannedData((prev) => (prev + event.key));
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
    };
  }, [isScanning]);

  
  useEffect(() => {
    let timer;
    if (isScanning) {
      timer = setTimeout(() => {
        if (scannedData) {
          handleScan();
        } else {
          setIsScanning(false);
          setErrorMessage("No barcode scanned. Please try again.");
        }
      }, 10000); // 10 seconds
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isScanning, scannedData]);

  const startScanning = () => {
    // Clear previous messages
    setMessage("");
    setStatusMessage("");
    setErrorMessage("");
    setScannedData("");
    setIsScanning(true);
  };

  const handleScan = async () => {
    setIsScanning(false);

    // Clear previous messages
    setMessage("");
    setStatusMessage("");
    setErrorMessage("");

    setIsLoading(true);

    if (!scannedData) {
      setErrorMessage("No barcode scanned.");
      setIsLoading(false);
      return;
    }

    try {
      // First check if the barcode exists at all, without status filter
      const { data: allOrders, error: allOrdersError } = await supabase
        .from("user_order")
        .select("*")
        .ilike("parcel_barcode", scannedData.trim());

      if (allOrdersError) {
        setErrorMessage("Error fetching all orders: " + allOrdersError.message);
        setIsLoading(false);
        return;
      } else {
        console.log("All Orders:", allOrders, "Error:", allOrdersError);
      }

      // Now check for pending orders specifically
      const { data: pendingOrders, error: selectError } = await supabase
        .from("user_order")
        .select("*")
        .ilike("parcel_barcode", scannedData.trim())
        .eq("status", "pending");

      if (selectError) {
        setErrorMessage(
          "Error fetching pending orders: " + selectError.message
        );
        setIsLoading(false);
        return;
      }

      // Insert scan record regardless of whether we found a pending order
      const { error: insertError } = await supabase
        .from("courier")
        .insert([{ scanned_barcode: scannedData.trim(), scanned_at: new Date() }]);

      if (insertError) {
        setErrorMessage("Error inserting scan record: " + insertError.message);
        setIsLoading(false);
        return;
      }

      // Success message for database insertion
      setMessage("Barcode scan successfully recorded in database!");

      // Check if we found any matching orders at all
      if (!allOrders || allOrders.length === 0) {
        setStatusMessage("❌ No orders found with this barcode at all.");
      }
      // Check if we found matching orders, but none are pending
      else if (!pendingOrders || pendingOrders.length === 0) {
        setStatusMessage(
          `⚠️ Order found but status is "${allOrders[0].status}" instead of "pending".`
        );
      }
      // We found a pending order with matching barcode
      else {
        setStatusMessage(
          `✅ Barcode matched with pending order! Status will be updated to completed.`
        );

        // Add a slight delay before navigation
        setTimeout(() => {
          navigate("/compartment");
        }, 1500);
      }
    } catch (error) {
      setErrorMessage("An unexpected error occurred: " + error.message);
    } finally {
      setIsLoading(false);
      setScannedData("");
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

          <div className="instructions">
            <p>Instructions</p>
            <ul>
              <li>Please Scan the Parcel</li>
              <li>Wait for the confirmation</li>
            </ul>
          </div>

          <div className="kiosk-scan-section">
            {!isScanning ? (
              <button
                className="kiosk-scan-button"
                onClick={startScanning}
                disabled={isLoading}
              >
                SCAN PARCEL
              </button>
            ) : (
              <div className="kiosk-scanning-active">
                <div className="kiosk-pulse"></div>
                <p className="kiosk-pulse-p">Please scan barcode now of the Parcel AirWaybill</p>
                <p className="kiosk-scanned-data">{scannedData}</p>
              </div>
            )}

            {/* Loading Animation */}
            {isLoading && <Loading />}

            {/* Success message for database insertion */}
            {message && <p className="kiosk-success">{message}</p>}

            {/* Status message for barcode matching result */}
            {statusMessage && (
              <p
                className={`kiosk-status ${
                  statusMessage.includes("✅")
                    ? "success"
                    : statusMessage.includes("❌")
                    ? "error"
                    : "warning"
                }`}
              >
                {statusMessage}
              </p>
            )}

            {/* Error message */}
            {errorMessage && <p className="kiosk-error">{errorMessage}</p>}

            <button className="btn" onClick={() => navigate("/start")}>
              Main Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}