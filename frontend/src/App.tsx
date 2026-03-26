import {
  Route,
  Routes,
  Navigate,
  Outlet,
  useLocation,
  BrowserRouter,
} from "react-router";
import { Analytics } from "@vercel/analytics/react";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import AboutPage from "./pages/AboutPage";
import Signup from "./pages/Signup";
import ContactPage from "./pages/ContactPage";
import Dashboard from "./pages/Dashboard";
import UploadItem from "./pages/UploadItem";
import ProfilePage from "./pages/ProfilePage";
import Recommendations from "./pages/Recommendations";
import { useAuth } from "./hooks/useAuth";
import ProtectedNavBar from "./components/Protected_NavBar";
import NavBar from "./components/NavBar";
import Wardrobe from "./pages/Wardrobe";

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Outlet /> : <Navigate to="/login" replace={true} />;
}

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const showNavBar = !["/login", "/signup"].includes(location.pathname);
  return (
    <>
      {showNavBar &&
        (user ? <ProtectedNavBar /> : !loading ? <NavBar /> : null)}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        {/* Routes accessible after logged in */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/item/new" element={<UploadItem />} />
          <Route path="/closet" element={<Wardrobe />} />
          <Route path="/outfits" element={<Recommendations />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace={true} />} />
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
      <Analytics />
    </BrowserRouter>
  );
};

export default App;
