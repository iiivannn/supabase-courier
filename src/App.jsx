import ScanBarcode from "./Components/ScanBarcode";
import StartPage from "./Components/StartPage";
import Compartment from "./Components/Compartment";
import ClosedVerify from "./Components/ClosedVerify";
import Received from "./Components/Received";

import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/scan" element={<ScanBarcode />} />
        <Route path="/compartment" element={<Compartment />} />
        <Route path="/closed" element={<ClosedVerify />} />
        <Route path="/received" element={<Received />} />
      </Routes>
    </Router>
  );
}

export default App;
