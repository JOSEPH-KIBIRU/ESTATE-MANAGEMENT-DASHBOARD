import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import {  useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Units from "./pages/Units";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import Tenants from "./pages/Tenants";
import TenantStatement from "./pages/TenantStatement"; 
import UtilityBilling from "./pages/UtilityBilling";
import AdvancedAnalytics from "./pages/AdvancedAnalytics";
import RentAutomation from "./pages/RentAutomation";
import MaintenanceManager from "./components/MaintenanceManager";
import Documents from './pages/Documents'; 
import RentCollection from "./pages/RentCollection";
import { Box, CircularProgress } from "@mui/material";

// App.js - Updated with conditional sidebar
function App() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center", 
          height: "100vh" 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Router>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Navbar />
        <div style={{ display: "flex", flex: 1 }}>
          {/* Show Sidebar ONLY when user is logged in */}
          {user && <Sidebar />}
          
          <div style={{ flex: 1, padding: "20px" }}>
            <Routes>
              {/* Dashboard is public */}
              <Route path="/" element={<Dashboard />} />
              
              {/* All other routes are protected - redirect to dashboard if not logged in */}
              <Route 
                path="/properties" 
                element={user ? <Properties /> : <Navigate to="/" />} 
              />
              <Route 
                path="/units" 
                element={user ? <Units /> : <Navigate to="/" />} 
              />
              <Route 
                path="/tenants" 
                element={user ? <Tenants /> : <Navigate to="/" />} 
              />
              <Route 
                path="/tenant-statement" 
                element={user ? <TenantStatement /> : <Navigate to="/" />} 
              />
              <Route 
                path="/utility-billing" 
                element={user ? <UtilityBilling /> : <Navigate to="/" />} 
              />
              <Route 
                path="/invoices" 
                element={user ? <Invoices /> : <Navigate to="/" />} 
              />
              <Route 
                path="/payments" 
                element={user ? <Payments /> : <Navigate to="/" />} 
              />
              <Route 
                path="/reports" 
                element={user ? <Reports /> : <Navigate to="/" />} 
              />
              <Route 
                path="/advanced-analytics" 
                element={user ? <AdvancedAnalytics /> : <Navigate to="/" />} 
              />
              <Route 
                path="/rent-automation" 
                element={user ? <RentAutomation /> : <Navigate to="/" />} 
              />
              <Route 
                path="/rent-collection" 
                element={user ? <RentCollection /> : <Navigate to="/" />} 
              />
              <Route 
                path="/maintenance" 
                element={user ? <MaintenanceManager /> : <Navigate to="/" />} 
              />
              <Route 
                path="/documents" 
                element={user ? <Documents /> : <Navigate to="/" />} 
              />

              <Route path="*" element={<h2>404: Page Not Found</h2>} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;