import { useState } from "react";
import { supabase } from "../supabase";
import useAuthUser from "../hooks/useAuthUser";
import logo from "../assets/parsafe_logo.png";
import Loading from "../loading/loading"; // Import the Loading component
import { useNavigate } from "react-router-dom";

export default function ScanBarcode() {
  const navigate = useNavigate(); // For navigating between pages
  const [barcode, setBarcode] = useState("");
  const [message, setMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Loading state
  const { user, error } = useAuthUser();

  const handleScan = async () => {
    // Clear previous messages
    setMessage("");
    setStatusMessage("");
    setErrorMessage("");

    if (!user) {
      setErrorMessage("User not logged in. Cannot receive parcel.");
      return;
    }

    setIsLoading(true); // Set loading to true

    if (!barcode) {
      setErrorMessage("Please enter a barcode.");
      setIsLoading(false); // Set loading to false
      return;
    }

    try {
      // First check if the barcode exists at all, without status filter
      const { data: allOrders, error: allOrdersError } = await supabase
        .from("user_order")
        .select("*")
        .ilike("parcel_barcode", barcode.trim()); // Trim to remove any whitespace

      if (allOrdersError) {
        setErrorMessage("Error fetching all orders: " + allOrdersError.message);
        setIsLoading(false); // Set loading to false
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
        setErrorMessage(
          "Error fetching pending orders: " + selectError.message
        );
        setIsLoading(false); // Set loading to false
        return;
      }

      // Insert scan record regardless of whether we found a pending order
      const { error: insertError } = await supabase
        .from("courier")
        .insert([{ scanned_barcode: barcode.trim(), scanned_at: new Date() }]);

      if (insertError) {
        setErrorMessage("Error inserting scan record: " + insertError.message);
        setIsLoading(false); // Set loading to false
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
        navigate("/compartment"); // Navigate to Compartment.jsx
      }
    } catch (error) {
      setErrorMessage("An unexpected error occurred: " + error.message);
    } finally {
      setIsLoading(false); // Set loading to false
      setBarcode(""); // Clear the input field regardless of outcome
    }
  };

  return (
    <div className="box">
      <div className="wrapper">
        <img src={logo} alt="ParSafe Logo" />

        <div className="title">
          <p>Welcome to ParSafe</p>
          <p>Your Smart Parcel Receiver</p>
        </div>

        <div className="get_user">
          <p>
            ParSafe User: {user ? user.user_metadata.username : "Loading..."}
          </p>
          {error && <p className="error">{error}</p>}
        </div>

        <div className="instructions">
          <p>Instructions</p>
          <ul>
            <li>Please Scan the Parcel</li>
            <li>Wait for the confirmation</li>
          </ul>
        </div>

        <div className="parcel_input">
          <input
            type="text"
            value={barcode}
            name="barcode"
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Enter scanned barcode"
          />
          <button onClick={handleScan}>Submit</button>

          {/* Loading Animation */}
          {isLoading && <Loading />}

          {/* Success message for database insertion */}
          {message && <p style={{ color: "green" }}>{message}</p>}

          {/* Status message for barcode matching result */}
          {statusMessage && (
            <p
              style={{
                color: statusMessage.includes("✅")
                  ? "blue"
                  : statusMessage.includes("❌")
                  ? "red"
                  : "orange",
              }}
            >
              {statusMessage}
            </p>
          )}

          {/* Error message */}
          {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
          <br />
          <br />

          <button onClick={() => navigate("/")}>Main Page</button>
        </div>
      </div>
    </div>
  );
}
