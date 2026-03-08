import {
  Route,
  Routes,
  Navigate,
  Outlet,
  useLocation,
  BrowserRouter,
} from "react-router";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import AboutPage from "./pages/AboutPage";
import Signup from "./pages/Signup";
import ContactPage from "./pages/ContactPage";
import Dashboard from "./pages/Dashboard";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import { useAuth } from "./hooks/useAuth";
import ProtectedNavBar from "./components/Protected_NavBar";
import NavBar from "./components/NavBar";

function ProtectedRoute() {
  const { user } = useAuth();
  return user ? <Outlet /> : <Navigate to="/login" replace={true} />;
}

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const showNavBar = !["/login", "/signup"].includes(location.pathname);
  return (
    <>
      {showNavBar && (user ? <ProtectedNavBar /> : <NavBar />)}
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
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
};

export default App;
