import { useEffect } from "react";
import { useProfile } from "@/context/ProfileContext";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

const Index = () => {
  const { isAuthenticated, signOut } = useAuth();
  const { isOnboarded, profileChecked, profile } = useProfile();

  useEffect(() => {
    if (isAuthenticated && profileChecked && !profile) {
      signOut();
    }
  }, [isAuthenticated, profileChecked, profile, signOut]);

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!profileChecked) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (isOnboarded) {
    return <Navigate to="/settings" replace />;
  }

  return <Navigate to="/onboarding" replace />;
};

export default Index;
