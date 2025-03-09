import React from "react";
import Lottie from "lottie-react";
import loadingAnimation from "../assets/loading.json"; // Adjust path if needed

export default function Loading() {
  return (
    <div
      style={{
        // display: "flex",
        // justifyContent: "center",
        // alignItems: "center",
        height: "100px",
        width: "100px",
      }}
    >
      <Lottie animationData={loadingAnimation} loop={true} />
    </div>
  );
}
