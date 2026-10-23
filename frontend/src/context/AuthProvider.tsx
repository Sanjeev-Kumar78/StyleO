import api, { clearAccessToken, setAccessToken } from "../services/api";
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  AuthContext,
  type User,
  type LoginCredentials,
  type SignupData,
} from "./AuthContext";
import exportedRoutes from "../api/config";

const authUrl = exportedRoutes.auth as string;

const fetchCurrentUser = async (): Promise<User | null> => {
  try {
    const response = await api.get(`${authUrl}/me`);
    return response.data;
  } catch (error) {
    const statusCode = axios.isAxiosError(error)
      ? error.response?.status
      : undefined;

    // Only clear auth state for real auth failures.
    // Network/gateway errors should not drop a valid in-memory/session token.
    if (statusCode === 401 || statusCode === 403) {
      clearAccessToken();
    }
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    setLoading(true);
    setUser(await fetchCurrentUser());
    setLoading(false);
  };

  useEffect(() => {
    let isCurrent = true;

    // Check auth in the background. The initial loading state is already true,
    // so this effect only updates state after the request settles.
    void fetchCurrentUser().then((currentUser) => {
      if (isCurrent) {
        setUser(currentUser);
        setLoading(false);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const formData = new URLSearchParams();
    formData.append("username", credentials.email); // OAuth2 spec uses 'username' field
    formData.append("password", credentials.password);

    const response = await api.post(`${authUrl}/login`, formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const token = response.data?.access_token;
    if (typeof token === "string" && token.length > 0) {
      setAccessToken(token);
    }

    // Cookie is set automatically by the browser (httponly) when allowed.
    // Also fetch user data after login
    if (response.data) {
      await refreshUser();
    }
  };

  const signup = async (data: SignupData) => {
    const response = await api.post(`${authUrl}/register`, data);
    const token = response.data?.access_token;
    if (typeof token === "string" && token.length > 0) {
      setAccessToken(token);
    }

    if (response.data) {
      await refreshUser();
    }
  };

  const googleLogin = async (credential: string) => {
    const response = await api.post(`${authUrl}/google`, { credential });
    const token = response.data?.access_token;
    if (typeof token === "string" && token.length > 0) {
      setAccessToken(token);
    }

    await refreshUser();
  };

  const logout = async () => {
    try {
      await api.post(`${authUrl}/logout`);
    } finally {
      clearAccessToken();
      setUser(null);
      window.location.assign("/login");
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
