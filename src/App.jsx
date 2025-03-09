import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { supabase } from "./supabase";
import ScanBarcode from "./Components/ScanBarcode";
import StartPage from "./Components/StartPage";
import Compartment from "./Components/Compartment";
import ClosedVerify from "./Components/ClosedVerify";
import Received from "./Components/Received";
import Login from "./Components/Login";

function AppRoutes() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
      }
    };
    checkUser();
  }, [navigate]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<StartPage />} />
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
