import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import useAuthUser from "../hooks/useAuthUser";
import Loading from "../loading/loading"; // Import the Loading component
import "./styles.css";
import logo from "../assets/parsafe_logo.png";

export default function ClosedVerify() {
  const navigate = useNavigate(); // For navigating between pages
  const { user, error } = useAuthUser();
  const [isLoading, setIsLoading] = useState(true); // Loading state

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false); // Stop loading after 5 seconds
      navigate("/received"); // Redirect to another file
    }, 5000);

    return () => clearTimeout(timer); // Cleanup the timer on component unmount
  }, [navigate]);

  return (
    <div className="box">
      <div className="wrapper">
        <img src={logo} alt="ParSafe Logo" />
        <div className="content_wrapper">
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

          <div className="loading">
            {isLoading ? (
              <>
                <p>Parcel being processed. Please wait.</p>
                <Loading /> {/* Show loading animation */}
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
