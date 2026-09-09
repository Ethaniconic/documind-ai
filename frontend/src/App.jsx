import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const isAuthenticated = () => {
    return Boolean(localStorage.getItem("documind_user"));
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route 
          path="/dashboard" 
          element={isAuthenticated() ? <Dashboard /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated() ? "/dashboard" : "/login"} replace />} 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}