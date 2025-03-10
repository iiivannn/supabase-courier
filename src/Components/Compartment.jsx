import { useNavigate } from "react-router-dom";
import useAuthUser from "../hooks/useAuthUser";
import "./styles.css";
import logo from "../assets/parsafe_logo.png";

export default function StartPage() {
  const navigate = useNavigate(); // For navigating between pages
  const { user, error } = useAuthUser();

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

          <div className="instructions">
            <p>Instructions</p>
            <ul>
              <li>Scan Complete.</li>
              <li>Confirmation Approved.</li>
              <li>Please open the door and place the parcel inside.</li>
              <li>Close it afterwards.</li>
              <li>Press &apos;Continue&apos;</li>
            </ul>
          </div>

          <button className="btn" onClick={() => navigate("/closed")}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
