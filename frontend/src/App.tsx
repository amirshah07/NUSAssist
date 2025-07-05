import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient'; 
import { SemestersProvider } from './contexts/SemestersContext';
import Homepage from './pages/Homepage/Homepage';
import RoadmapPage from './pages/RoadmapPage/RoadmapPage';
import TimetablePage from './pages/TimetablePage/TimetablePage';
import GpaPage from './pages/GpaPage/GpaPage';
import Login from './pages/Login and Register/Login';
import Register from './pages/Login and Register/Register';
import ResetPassword from './pages/Login and Register/ResetPassword'; 
import Loading from './components/Loading/Loading';
import PageNotFound from './pages/PageNotFound/PageNotFound';
import { Analytics } from "@vercel/analytics/react"

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check current session
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return <Loading />;
  }

  return isAuthenticated ? (
    <SemestersProvider>{children}</SemestersProvider>
  ) : (
    <Navigate to="/login" replace />
  );
};

// Public Route Component (for login/register)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check current session
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return <Loading />;
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/homepage" replace />;
};


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Protected Routes - only accessible when logged in */}
        <Route 
          index 
          element={
            <ProtectedRoute>
              <Homepage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/homepage" 
          element={
            <ProtectedRoute>
              <Homepage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/roadmap" 
          element={
            <ProtectedRoute>
              <RoadmapPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/timetable" 
          element={
            <ProtectedRoute>
              <TimetablePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/academics" 
          element={
            <ProtectedRoute>
              <GpaPage />
            </ProtectedRoute>
          } 
        />

        {/* Public Routes - only accessible when not logged in */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } 
        />

        {/* Reset Password Route - only accessible with valid reset link */}
        <Route 
          path="/resetpassword" 
          element={<ResetPassword />}
        />

        {/* 404 Page */}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
      <Analytics />
    </BrowserRouter>
  );
}

export default App;