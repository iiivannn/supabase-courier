import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import ScanBarcode from "./Components/ScanBarcode";
import StartPage from "./Components/StartPage";
import Compartment from "./Components/Compartment";
import ClosedVerify from "./Components/ClosedVerify";
import Received from "./Components/Received";
import Login from "./Components/Login";

function AppRoutes() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkDeviceSelected = () => {
      const selectedDevice = localStorage.getItem("selectedDevice");
      // Only redirect to login if no device is selected
      if (!selectedDevice) {
        navigate("/login");
      }
    };
    checkDeviceSelected();
  }, [navigate]);

  return (
    <Routes>
      <Route path="/start" element={<StartPage />} />
      <Route path="/" element={<Login />} />
      <Route path="/scan" element={<ScanBarcode />} />
      <Route path="/compartment" element={<Compartment />} />
      <Route path="/closed" element={<ClosedVerify />} />
      <Route path="/received" element={<Received />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
