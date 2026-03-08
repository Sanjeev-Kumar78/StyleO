import api from "../services/api";
import React, { useEffect, useState } from "react";
import {
  AuthContext,
  type User,
  type LoginCredentials,
  type SignupData,
} from "./AuthContext";
import exportedRoutes from "../api/config";

const authUrl = exportedRoutes.auth as string;
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    setLoading(true);
    try {
      const response = await api.get(`${authUrl}/me`);
      setUser(response.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    // Backend expects LoginRequestForm (form-data)
    // The "email" field is used for authentication
    const formData = new URLSearchParams();
    formData.append("email", credentials.email);
    formData.append("password", credentials.password);

    const response = await api.post(`${authUrl}/login`, formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    // Cookie is set automatically by the browser (httponly)
    // Also fetch user data after login
    if (response.data) {
      await refreshUser();
    }
  };

  const signup = async (data: SignupData) => {
    const response = await api.post(`${authUrl}/register`, data);
    if (response.data) {
      await refreshUser();
    }
  };

  const googleLogin = async (credential: string) => {
    await api.post(`${authUrl}/google`, { credential });
    await refreshUser();
  };

  const logout = async () => {
    try {
      await api.post(`${authUrl}/logout`);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, googleLogin, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};
