import { useNavigate } from "react-router-dom";
import { useState } from "react";
import useAuthUser from "../hooks/useAuthUser";
import { supabase } from "../supabase";
import LogoutModal from "./LogoutModal";
import "./styles.css";
import logo from "../assets/parsafe_logo.png";

export default function StartPage() {
  const navigate = useNavigate(); // For navigating between pages
  const { user, error } = useAuthUser();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
    } else {
      navigate("/login");
    }
  };

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
              <li>
                Check if the ParSafe User matches the Parcel Customer Name
              </li>
              <li>
                Click the &apos;Start&apos; below to start the deliver process.
              </li>
              <li>Scan the parcel using the outside scanner.</li>
              <li>
                Upon completion, open the compartment door and place the parcel.
              </li>
              <li>Wait until the process is complete.</li>
            </ul>
          </div>

          <div className="buttons">
            <button className="btn" onClick={() => navigate("/scan")}>
              Start
            </button>
          </div>
        </div>

        <div className="logout">
          <button className="btn" onClick={() => setIsModalOpen(true)}>
            Logout
          </button>

          <LogoutModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </div>
  );
}
