import React, { useEffect, useState, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"; // Added Route import
import { useAppStore } from "./store";
import { apiClient } from "./lib/api-client";
import { GET_USER_INFO, LOGOUT_ROUTE } from "./utils/constants";

// Lazy-loaded route components for code splitting
const Auth = lazy(() => import("./Pages/auth"));
const Chat = lazy(() => import("./Pages/chat"));
const Profile = lazy(() => import("./Pages/profile"));

const PrivateRoute = ({ children }) => {
  const { userInfo } = useAppStore();
  const isAuthenticated = !!userInfo;
  if (isAuthenticated) {
    return children;
  }
  return <Navigate to="/auth" />;
};
const AuthRoute = ({ children }) => {
  const { userInfo } = useAppStore();
  const isAuthenticated = !!userInfo;
  if (isAuthenticated) {
    return <Navigate to="/chat" />;
  }
  return children;
};

function App() {
  const { userInfo, setUserInfo } = useAppStore();
  const [loading, setLoading] = useState(true);

  // Unified log out function
  const handleLogout = async () => {
    try {
      await apiClient.post(
        LOGOUT_ROUTE,
        {},
        { withCredentials: true }
      );
    } catch (error) {
      console.log("Error during auto-logout:", error);
    } finally {
      localStorage.removeItem("sessionMetadata");
      setUserInfo(undefined);
    }
  };

  useEffect(() => {
    let logoutTimer;

    const checkSessionAndSetupLogout = async () => {
      try {
        const metadataStr = localStorage.getItem("sessionMetadata");
        if (!metadataStr) {
          // No session metadata, instantly skip to login
          setUserInfo(undefined);
          setLoading(false);
          return;
        }

        const metadata = JSON.parse(metadataStr);
        if (!metadata.expiry || Date.now() > metadata.expiry) {
          // Session expired locally
          localStorage.removeItem("sessionMetadata");
          setUserInfo(undefined);
          setLoading(false);
          return;
        }

        // If we get here, metadata says session is likely valid.
        // If we don't have userInfo yet, fetch it from backend.
        if (!userInfo) {
          const response = await apiClient.get(GET_USER_INFO, {
            withCredentials: true,
          });
          
          if (response.status === 200 && response.data.id) {
            setUserInfo(response.data);
          } else {
            // Invalid session according to backend
            localStorage.removeItem("sessionMetadata");
            setUserInfo(undefined);
          }
        }

        // Setup auto-logout timer
        const remainingTime = metadata.expiry - Date.now();
        if (remainingTime > 0) {
          logoutTimer = setTimeout(() => {
            handleLogout();
          }, remainingTime);
        } else {
          handleLogout();
        }

      } catch (error) {
        console.log("Error during session check:", error);
        localStorage.removeItem("sessionMetadata");
        setUserInfo(undefined);
      } finally {
        setLoading(false);
      }
    };

    checkSessionAndSetupLogout();

    return () => {
      if (logoutTimer) {
        clearTimeout(logoutTimer);
      }
    };
  }, [userInfo, setUserInfo]);

  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-slate-900 text-indigo-600 font-medium text-xl">Checking session...</div>;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900 text-indigo-600 font-medium text-xl">Loading PolyChat...</div>}>
        <Routes>
          <Route
            path="/auth"
            element={
              <AuthRoute>
                <Auth />
              </AuthRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <PrivateRoute>
                <Chat />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/auth" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
