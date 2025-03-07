import { useState } from "react";
import { supabase } from "../../supabase";

const ScanBarcode = () => {
  const [barcode, setBarcode] = useState("");
  const [message, setMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleScan = async () => {
    // Clear previous messages
    setMessage("");
    setStatusMessage("");
    setErrorMessage("");

    if (!barcode) {
      setErrorMessage("Please enter a barcode.");
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
        return;
      }

      // Insert scan record regardless of whether we found a pending order
      const { error: insertError } = await supabase
        .from("courier")
        .insert([{ scanned_barcode: barcode.trim(), scanned_at: new Date() }]);

      if (insertError) {
        setErrorMessage("Error inserting scan record: " + insertError.message);
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
      }
    } catch (error) {
      setErrorMessage("An unexpected error occurred: " + error.message);
    } finally {
      setBarcode(""); // Clear the input field regardless of outcome
    }
  };

  return (
    <div>
      <h2>Scan Barcode</h2>
      <input
        type="text"
        value={barcode}
        name="barcode"
        onChange={(e) => setBarcode(e.target.value)}
        placeholder="Enter scanned barcode"
      />
      <button onClick={handleScan}>Submit</button>

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
    </div>
  );
};

export default ScanBarcode;
