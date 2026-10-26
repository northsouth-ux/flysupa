import { useEffect } from "react";
import { useLocation, Routes, Route } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import { ThemeProvider } from "./components/theme-provider"

import AuthRedirect from "./components/AuthRedirect";
import Navbar from "./components/Navbar";

import Lezioni from "./pages/Lezioni";
import Login from "./pages/Auth/Login";
import Check from "./pages/Auth/Check";
import Users from "./pages/Users";
import Account from "./pages/Account";
import Register from "./pages/Auth/Register";
import UserEdit from "./components/UserEditForm";
import EditLesson from "./pages/EditLesson";
import ConfirmRegistration from "./pages/Auth/ConfirmRegistration";
import SchoolRegistration from "./pages/SchoolRegistration";
import SchoolAdmin from "./pages/SchoolAdmin";
import PlatformAdmin from "./pages/PlatformAdmin";
import Onboarding from "./pages/Onboarding";
import Join from "./pages/Join";

function App() {
  const location = useLocation();

  useEffect(() => { 
    const loadFlyonui = async () => {
      const cachedFlyonui = localStorage.getItem('flyonui');
      
      try {
        const flyonui = await import("flyonui/flyonui");
        
        if (!cachedFlyonui) {
          localStorage.setItem('flyonui', 'loaded');
        }
        // Check if HSStaticMethods exists before calling
        if ((window as any).HSStaticMethods && typeof (window as any).HSStaticMethods.autoInit === 'function') {
          (window as any).HSStaticMethods.autoInit();
        } else {
          console.warn('HSStaticMethods.autoInit is not available');
        }
      } catch (err) {
        console.error('Error loading flyonui:', err);
      }
    };
    loadFlyonui();
  }, [location.pathname]);

  return (
    <ThemeProvider defaultTheme="system" storageKey="app-theme">
      <UserProvider>
        <AuthRedirect />
        <div className="min-h-screen bg-background">
          {location.pathname !== "/login" && <Navbar />}
          <div className="p-4 md:p-6">
            <Routes>
              <Route path="/" element={<Lezioni />} />
              <Route path="/home" element={<Lezioni />} />
              <Route path="/login" element={<Login />} />
              <Route path="/users" element={<Users />} />
              <Route path="/user-edit/:id" element={<UserEdit />} />
              <Route path="/edit-lesson/:id" element={<EditLesson />} />
              <Route path="/account" element={<Account />} />
              <Route path="/register" element={<Register />} />
              <Route path="/check" element={<Check />} />
              <Route path="/auth/confirm" element={<ConfirmRegistration />} />
              <Route path="/register-school" element={<SchoolRegistration />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/dashboard" element={<SchoolAdmin />} />
              <Route path="/platform-admin" element={<PlatformAdmin />} />
              <Route path="/join" element={<Join />} />
            </Routes>
          </div>
        </div>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;