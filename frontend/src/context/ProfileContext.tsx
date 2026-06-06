import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useAuth } from "./AuthContext";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface StudentProfile {
  name: string;
  email: string;
  major: string;
  gpa: number;
  gre: number | null;
  sop: string;
  resumeText: string;
  resumeFileName: string | null;
  skills: string[];
  experience: string;
  projects: string;
  coursework: string[];
  location_preference: string[];
  target_job: string;
  current_org: string;
  current_role: string;
}

interface ProfileContextType {
  profile: StudentProfile | null;
  setProfile: (p: StudentProfile) => void;
  updateProfile: (updates: Partial<StudentProfile>) => void;
  saveProfileToServer: (p?: StudentProfile) => Promise<void>;
  fetchProfile: () => Promise<StudentProfile | null>;
  clearProfile: () => void;
  isOnboarded: boolean;
  isLoadingProfile: boolean;
  profileChecked: boolean;
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  setProfile: () => {},
  updateProfile: () => {},
  saveProfileToServer: async () => {},
  fetchProfile: async () => null,
  clearProfile: () => {},
  isOnboarded: false,
  isLoadingProfile: false,
  profileChecked: false,
});

export const useProfile = () => useContext(ProfileContext);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfileState] = useState<StudentProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileChecked, setProfileChecked] = useState(false);
  const { token } = useAuth();

  const fetchProfile = useCallback(async (): Promise<StudentProfile | null> => {
    const activeToken = token || localStorage.getItem("access_token");
    console.log("Fetching profile with token:", activeToken);

    if (!activeToken) {
      console.log("No valid token found");
      setProfileState(null);
      setIsLoadingProfile(false);
      setProfileChecked(true);
      return null;
    }

    setIsLoadingProfile(true);
    try {
      console.log("Starting profile fetch...");
      console.log("before API call to fetch profile...");
      const res = await fetch(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      console.log("profile status", res.status);

      if (res.ok) {
        const data = await res.json();
        console.log("Profile fetched successfully:", data);
        setProfileState(data);
        return data;
      }

      console.log("Profile fetch failed with non-200 status");
      setProfileState(null);
      return null;
    } catch (err) {
      console.error("Profile fetch error:", err);
      setProfileState(null);
      return null;
    } finally {
      setIsLoadingProfile(false);
      setProfileChecked(true);
    }
  }, [token]);

  useEffect(() => {
    const load = async () => {
      const activeToken = token || localStorage.getItem("access_token");
      if (!activeToken) {
        setProfileState(null);
        setIsLoadingProfile(false);
        setProfileChecked(true);
        return;
      }
      await fetchProfile();
    };
    load();
  }, [token, fetchProfile]);

  const setProfile = useCallback((p: StudentProfile) => {
    setProfileState(p);
    localStorage.setItem("student-profile", JSON.stringify(p));
  }, []);

  const updateProfile = useCallback((updates: Partial<StudentProfile>) => {
    setProfileState((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem("student-profile", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const saveProfileToServer = useCallback(async (p?: StudentProfile) => {
    const authToken = token || localStorage.getItem("access_token");
    if (!authToken) throw new Error("Not logged in");

    const payload = p ?? profile;
    if (!payload) throw new Error("No profile to save");

    try {
      const res = await fetch(`${API_BASE}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Failed to save profile");
      }

      setProfileState(payload);
      localStorage.setItem("student-profile", JSON.stringify(payload));
    } catch (err: any) {
      console.error("Profile save error:", err);
      throw new Error(err.message ?? "Failed to save profile");
    }
  }, [profile, token]);

  const clearProfile = useCallback(() => {
    setProfileState(null);
    setProfileChecked(false);
    setIsLoadingProfile(false);
    localStorage.removeItem("student-profile");
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        setProfile,
        updateProfile,
        saveProfileToServer,
        fetchProfile,
        clearProfile,
        isOnboarded: profileChecked && !!profile?.name,
        isLoadingProfile,
        profileChecked,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};
