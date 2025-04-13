/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
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
  const [showModal, setShowModal] = useState(false); // Modal visibility state
  const [modalTitle, setModalTitle] = useState(""); // Added modal title state
  const [manualInput, setManualInput] = useState(""); // State for manual input
  const [isOversizedScan, setIsOversizedScan] = useState(false); // State to track oversized scan
  const [scanComplete, setScanComplete] = useState(false); // State to track when a scan is complete
  const [showManualInput, setShowManualInput] = useState(false); // State to toggle manual input visibility
  const [isOversizedSuccess, setIsOversizedSuccess] = useState(false); // Track if oversized scan was successful

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

  // Handle barcode scanner input - modified to handle a single scan properly
  useEffect(() => {
    let barcodeBuffer = "";
    let scanTimeoutId = null;

    const handleKeyPress = (event) => {
      if (isScanning && !scanComplete) {
        // Add the pressed key to our buffer
        barcodeBuffer += event.key;

        // Clear any existing timeout
        if (scanTimeoutId) {
          clearTimeout(scanTimeoutId);
        }

        // Set a new timeout - if no new character comes in for 300ms, we consider the scan complete
        scanTimeoutId = setTimeout(() => {
          if (barcodeBuffer) {
            setScannedData(barcodeBuffer);
            setScanComplete(true);
            processScannedBarcode(barcodeBuffer);
          }
        }, 300);
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => {
      window.removeEventListener("keypress", handleKeyPress);
      if (scanTimeoutId) {
        clearTimeout(scanTimeoutId);
      }
    };
  }, [isScanning, scanComplete]);

  // Process the scanned barcode once scanning is complete
  const processScannedBarcode = (barcodeData) => {
    if (isOversizedScan) {
      handleOversizedScan(barcodeData);
    } else {
      handleScan(barcodeData);
    }
  };

  useEffect(() => {
    if (statusMessage || errorMessage) {
      setShowModal(true); // Show modal when a status or error message is set

      // Only set auto-close timer if it's not a successful oversized scan
      if (!isOversizedSuccess) {
        // Automatically close the modal after 30 seconds
        const timer = setTimeout(() => {
          setShowModal(false);
          setStatusMessage(""); // Clear the status message
          setErrorMessage(""); // Clear the error message
        }, 30000);

        return () => clearTimeout(timer); // Cleanup the timer
      }
    }
  }, [statusMessage, errorMessage, isOversizedSuccess]);

  const startScanning = () => {
    // Clear previous state
    setMessage("");
    setStatusMessage("");
    setErrorMessage("");
    setScannedData("");
    setManualInput(""); // Clear manual input field
    setScanComplete(false); // Reset scan complete state
    setIsOversizedSuccess(false); // Reset oversized success flag
    setIsScanning(true);
  };

  const startOversizedScanning = () => {
    // Clear previous state
    setMessage("");
    setStatusMessage("");
    setErrorMessage("");
    setScannedData("");
    setManualInput(""); // Clear manual input field
    setScanComplete(false); // Reset scan complete state
    setIsOversizedSuccess(false); // Reset oversized success flag
    setIsOversizedScan(true);
    setIsScanning(true);
  };

  const handleScan = async (barcodeData) => {
    // Use parameter or state if no parameter provided
    const barcode = barcodeData || scannedData;

    setIsScanning(false);
    setIsLoading(true); // Show loading while processing

    // Clear previous messages
    setMessage("");
    setStatusMessage("");
    setErrorMessage("");
    setModalTitle("");

    if (!barcode) {
      setModalTitle("Error");
      setErrorMessage("No barcode scanned.");
      setIsLoading(false);
      return;
    }

    try {
      // First check if the barcode exists at all, without status filter
      const { data: allOrders, error: allOrdersError } = await supabase
        .from("user_order")
        .select("*")
        .ilike("parcel_barcode", barcode.trim());

      if (allOrdersError) {
        setModalTitle("Error");
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
        .ilike("parcel_barcode", barcode.trim())
        .eq("status", "pending");

      if (selectError) {
        setModalTitle("Error");
        setErrorMessage(
          "Error fetching pending orders: " + selectError.message
        );
        setIsLoading(false);
        return;
      }

      // Insert scan record regardless of whether we found a pending order
      const { error: insertError } = await supabase
        .from("courier")
        .insert([{ scanned_barcode: barcode.trim(), scanned_at: new Date() }]);

      if (insertError) {
        setModalTitle("Error");
        setErrorMessage("Error inserting scan record: " + insertError.message);
        setIsLoading(false);
        return;
      }

      // Success message for database insertion
      setMessage("Barcode scan successfully recorded in database!");

      // Check if we found any matching orders at all
      if (!allOrders || allOrders.length === 0) {
        setModalTitle("Parcel Not Found");
        setStatusMessage("No orders found with this barcode.");
      }
      // Check if we found matching orders, but none are pending
      else if (!pendingOrders || pendingOrders.length === 0) {
        setModalTitle("Parcel Status");
        setStatusMessage(
          `Order found but status is "${allOrders[0].status}" instead of "pending".`
        );
      }
      // We found a pending order with matching barcode
      else {
        setModalTitle("Parcel Found");
        setStatusMessage(
          `Barcode matched with pending order! Status will be updated to completed.`
        );

        // Add a slight delay before navigation
        setTimeout(() => {
          navigate("/compartment");
        }, 1500);
      }
    } catch (error) {
      setModalTitle("Error");
      setErrorMessage("An unexpected error occurred: " + error.message);
    } finally {
      setIsLoading(false);
      setScanComplete(false); // Reset for potential future scans
    }
  };

  const handleOversizedScan = async (barcodeData) => {
    // Use parameter or state if no parameter provided
    const barcode = barcodeData || scannedData;

    setIsScanning(false);
    setIsOversizedScan(false);
    setIsLoading(true); // Show loading while processing

    // Clear previous messages
    setMessage("");
    setStatusMessage("");
    setErrorMessage("");
    setModalTitle("");
    setIsOversizedSuccess(false);

    if (!barcode) {
      setModalTitle("Error");
      setErrorMessage("No barcode scanned.");
      setIsLoading(false);
      return;
    }

    try {
      // Check if the barcode exists in the database
      const { data: allOrders, error: allOrdersError } = await supabase
        .from("user_order")
        .select("*")
        .ilike("parcel_barcode", barcode.trim());

      if (allOrdersError) {
        setModalTitle("Error");
        setErrorMessage("Error fetching orders: " + allOrdersError.message);
        setIsLoading(false);
        return;
      }

      if (!allOrders || allOrders.length === 0) {
        setModalTitle("Parcel Not Found");
        setStatusMessage("No orders found with this barcode.");
        setIsLoading(false);
        return;
      }

      // Update the status of the parcel to "oversized"
      const { error: updateError } = await supabase
        .from("user_order")
        .update({ status: "oversized", completed_at: new Date() })
        .ilike("parcel_barcode", barcode.trim());

      if (updateError) {
        setModalTitle("Error");
        setErrorMessage("Error updating parcel status: " + updateError.message);
        setIsLoading(false);
        return;
      }

      // Display success modal with redirect option
      setModalTitle("Parcel Found");
      setStatusMessage(
        "Parcel is recorded as oversized. You may now place it anywhere safe from theft."
      );
      setIsOversizedSuccess(true); // Set flag to indicate successful oversized scan
    } catch (error) {
      setModalTitle("Error");
      setErrorMessage("An unexpected error occurred: " + error.message);
    } finally {
      setIsLoading(false);
      setScanComplete(false); // Reset for potential future scans
    }
  };

  // const handleManualSubmit = () => {
  //   if (!manualInput.trim()) {
  //     setModalTitle("Error");
  //     setErrorMessage("Please enter a barcode to submit.");
  //     return;
  //   }

  //   setScannedData(manualInput.trim());
  //   handleScan(manualInput.trim());
  //   setManualInput("");
  // };

  // const handleManualOversizedSubmit = () => {
  //   if (!manualInput.trim()) {
  //     setModalTitle("Error");
  //     setErrorMessage("Please enter a barcode to submit.");
  //     return;
  //   }

  //   setScannedData(manualInput.trim());
  //   handleOversizedScan(manualInput.trim());
  //   setManualInput("");
  // };

  const closeModal = () => {
    setShowModal(false);
    setStatusMessage(""); // Clear the status message when modal is closed
    setErrorMessage(""); // Clear the error message when modal is closed
    setModalTitle(""); // Clear the modal title when modal is closed
    setIsOversizedSuccess(false); // Reset the oversized success flag
  };

  const closeModalAndRedirect = () => {
    setShowModal(false);
    setStatusMessage("");
    setErrorMessage("");
    setModalTitle("");
    setIsOversizedSuccess(false);
    navigate("/start"); // Redirect to the start page
  };

  useEffect(() => {
    let inactivityTimer;

    const resetInactivityTimer = () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      inactivityTimer = setTimeout(() => {
        navigate("/start"); // Redirect to the start page after 20 seconds of inactivity
      }, 20000); // 20 seconds
    };

    // Reset the timer on any user interaction
    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    // Attach event listeners for user activity
    window.addEventListener("keypress", handleUserActivity);
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("click", handleUserActivity);

    // Start the inactivity timer when the component mounts
    resetInactivityTimer();

    return () => {
      // Cleanup event listeners and timer on component unmount
      window.removeEventListener("keypress", handleUserActivity);
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("click", handleUserActivity);
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
    };
  }, [navigate]);

  return (
    <div className="box">
      {/* Modal Notification */}
      {showModal && (
        <div className="modal">
          <div
            className={`modal-content ${
              statusMessage.includes("oversized") ||
              (isOversizedSuccess && statusMessage)
                ? "success"
                : statusMessage.includes("No orders found") || errorMessage
                ? "error"
                : "warning"
            }`}
          >
            {/* Only show close X button if not a successful oversized scan */}
            {!isOversizedSuccess && (
              <button className="modal-close-x" onClick={closeModal}>
                &times;
              </button>
            )}

            {/* Modal Title */}
            {modalTitle && <h3 className="modal-title">{modalTitle}</h3>}

            {/* Modal Message */}
            <p className="modal-msg">{errorMessage || statusMessage}</p>

            {/* Go to Start Page button for oversized scans */}
            {(isOversizedSuccess || statusMessage.includes("oversized")) && (
              <button
                className="modal-redirect-button"
                onClick={closeModalAndRedirect}
              >
                Go to Start Page
              </button>
            )}

            {/* Only show close button if not a successful oversized scan */}
            {!isOversizedSuccess && (
              <button className="modal-close-button" onClick={closeModal}>
                Close
              </button>
            )}
          </div>
        </div>
      )}

      <CheckLogout deviceId={selectedDevice} />
      <div className="wrapper">
        <div className="content_wrapper">
          <img className="logo" src={logo} alt="ParSafe Logo" />
          <div className="title">
            <p>Welcome to ParSafe!</p>
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
              <li>For debugging, you can use manual input below</li>
            </ul>
          </div>

          {/* Debug Mode Toggle Button */}
          {/* <div className="debug-mode-toggle">
            <button
              className="debug-toggle-button"
              onClick={() => setShowManualInput(!showManualInput)}
            >
              {showManualInput ? "Hide Debug Input" : "Show Debug Input"}
            </button>
          </div> */}

          {/* Manual Input Section for Debugging */}
          {/* {showManualInput && (
            <div className="manual-input-debug">
              <h3>Manual Input (Debug Mode)</h3>
              <div className="debug-input-container">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Enter barcode for testing"
                  className="debug-input-field"
                  disabled={isLoading}
                />
                <div className="debug-buttons">
                  <button
                    onClick={handleManualSubmit}
                    disabled={isLoading || !manualInput.trim()}
                    className="debug-submit-button"
                  >
                    Process as Normal
                  </button>
                  <button
                    onClick={handleManualOversizedSubmit}
                    disabled={isLoading || !manualInput.trim()}
                    className="debug-oversized-button"
                  >
                    Process as Oversized
                  </button>
                </div>
              </div>
              <div className="debug-info">
                <strong>Current State:</strong>
                <div className="debug-state">
                  <p>Scanning: {isScanning ? "Yes" : "No"}</p>
                  <p>Scan Complete: {scanComplete ? "Yes" : "No"}</p>
                  <p>Loading: {isLoading ? "Yes" : "No"}</p>
                  <p>Oversized Mode: {isOversizedScan ? "Yes" : "No"}</p>
                  <p>Oversized Success: {isOversizedSuccess ? "Yes" : "No"}</p>
                  <p>Scanned Data: {scannedData || "(none)"}</p>
                </div>
              </div>
            </div>
          ) */}

          <div className="kiosk-scan-section">
            {/* Error message */}
            {errorMessage && <p className="kiosk-error">{errorMessage}</p>}

            {!isScanning ? (
              <>
                <button
                  className="kiosk-scan-button"
                  onClick={startScanning}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Scan Parcel"}
                </button>
                <button
                  className="kiosk-scan-button"
                  onClick={startOversizedScanning}
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Scan Oversized Parcel"}
                </button>
              </>
            ) : (
              <div className="kiosk-scanning-active">
                <div className="kiosk-pulse"></div>
                <p className="kiosk-pulse-p">
                  Please scan barcode now of the Parcel AirWaybill
                </p>
                <p className="kiosk-scanned-data">{scannedData}</p>
                <button
                  className="kiosk-cancel-scan"
                  onClick={() => {
                    setIsScanning(false);
                    setIsOversizedScan(false);
                    setScanComplete(false);
                  }}
                >
                  Cancel Scan
                </button>
              </div>
            )}

            {/* Loading Animation */}
            {isLoading && (
              <div className="scan-loading">
                <Loading />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
