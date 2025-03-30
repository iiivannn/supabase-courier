import React from "react";
import Lottie from "lottie-react";
import loadingAnimation from "../assets/loading.json"; // Adjust path if needed

export default function Loading() {
  return (
    <div>
      <Lottie animationData={loadingAnimation} loop={true} />
    </div>
  );
}
