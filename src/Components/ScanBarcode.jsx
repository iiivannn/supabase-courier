/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import logo from "../assets/parsafe_logo.png";
import Loading from "../loading/loading";
import CheckLogout from "./logout/checkLogout";
import { useNavigate } from "react-router-dom";
import "./styles.css";

export default function ScanBarcode() {
  const navigate = useNavigate();
  const [barcode, setBarcode] = useState("");
  const [message, setMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState("");
  const [deviceUsername, setDeviceUsername] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [isOversizedScan, setIsOversizedScan] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [isOversizedSuccess, setIsOversizedSuccess] = useState(false);

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

  useEffect(() => {
    let barcodeBuffer = "";
    let scanTimeoutId = null;

    const handleKeyPress = (event) => {
      if (isScanning && !scanComplete) {
        barcodeBuffer += event.key;

        if (scanTimeoutId) {
          clearTimeout(scanTimeoutId);
        }

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

  const processScannedBarcode = (barcodeData) => {
    if (isOversizedScan) {
      handleOversizedScan(barcodeData);
    } else {
      handleScan(barcodeData);
    }
  };

  useEffect(() => {
    if (statusMessage || errorMessage) {
      setShowModal(true);

      if (!isOversizedSuccess) {
        const timer = setTimeout(() => {
          setShowModal(false);
          setStatusMessage("");
          setErrorMessage("");
        }, 30000);

        return () => clearTimeout(timer);
      }
    }
  }, [statusMessage, errorMessage, isOversizedSuccess]);

  const startScanning = () => {
    setMessage("");
    setStatusMessage("");
    setErrorMessage("");
    setScannedData("");
    setManualInput("");
    setScanComplete(false);
    setIsOversizedSuccess(false);
    setIsScanning(true);
  };

  const startOversizedScanning = () => {
    // Clear previous state
    setMessage("");
    setStatusMessage("");
    setErrorMessage("");
    setScannedData("");
    setManualInput("");
    setScanComplete(false);
    setIsOversizedSuccess(false);
    setIsOversizedScan(true);
    setIsScanning(true);
  };

  const handleScan = async (barcodeData) => {
    const barcode = barcodeData || scannedData;

    setIsScanning(false);
    setIsLoading(true);

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

      const { error: insertError } = await supabase
        .from("courier")
        .insert([{ scanned_barcode: barcode.trim(), scanned_at: new Date() }]);

      if (insertError) {
        setModalTitle("Error");
        setErrorMessage("Error inserting scan record: " + insertError.message);
        setIsLoading(false);
        return;
      }

      setMessage("Barcode scan successfully recorded in database!");

      if (!allOrders || allOrders.length === 0) {
        setModalTitle("Parcel Not Found");
        setStatusMessage("No orders found with this barcode.");
      } else if (!pendingOrders || pendingOrders.length === 0) {
        setModalTitle("Parcel Status");
        setStatusMessage(
          `Order found but status is "${allOrders[0].status}" instead of "pending".`
        );
      } else {
        setModalTitle("Parcel Found");
        setStatusMessage(
          `Barcode matched with pending order! Status will be updated to completed.`
        );

        setTimeout(() => {
          navigate("/compartment");
        }, 1500);
      }
    } catch (error) {
      setModalTitle("Error");
      setErrorMessage("An unexpected error occurred: " + error.message);
    } finally {
      setIsLoading(false);
      setScanComplete(false);
    }
  };

  const handleOversizedScan = async (barcodeData) => {
    const barcode = barcodeData || scannedData;

    setIsScanning(false);
    setIsOversizedScan(false);
    setIsLoading(true);

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
      setIsOversizedSuccess(true);
    } catch (error) {
      setModalTitle("Error");
      setErrorMessage("An unexpected error occurred: " + error.message);
    } finally {
      setIsLoading(false);
      setScanComplete(false);
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
    setStatusMessage("");
    setErrorMessage("");
    setModalTitle("");
    setIsOversizedSuccess(false);
  };

  const closeModalAndRedirect = () => {
    setShowModal(false);
    setStatusMessage("");
    setErrorMessage("");
    setModalTitle("");
    setIsOversizedSuccess(false);
    navigate("/start");
  };

  useEffect(() => {
    let inactivityTimer;

    const resetInactivityTimer = () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      inactivityTimer = setTimeout(() => {
        navigate("/start");
      }, 20000);
    };

    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    window.addEventListener("keypress", handleUserActivity);
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("click", handleUserActivity);

    resetInactivityTimer();

    return () => {
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
            {!isOversizedSuccess && (
              <button className="modal-close-x" onClick={closeModal}>
                &times;
              </button>
            )}

            {modalTitle && <h3 className="modal-title">{modalTitle}</h3>}

            <p className="modal-msg">{errorMessage || statusMessage}</p>

            {(isOversizedSuccess || statusMessage.includes("oversized")) && (
              <button
                className="modal-redirect-button"
                onClick={closeModalAndRedirect}
              >
                Go to Start Page
              </button>
            )}

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
            <p>{selectedDevice}</p>
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
