import axios from "axios";
import React, { createContext, useEffect, useState } from "react";

export type User = {
  id?: string;
  _id?: string;
  username?: string;
  email: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type SignupData = {
  username: string;
  email: string;
  password: string;
};

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

axios.defaults.withCredentials = true;
axios.defaults.baseURL = import.meta.env.VITE_BACKEND_URL;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/auth/me");
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
    // Backend expects OAuth2PasswordRequestForm (form-data)
    // The "username" field is used for email in OAuth2 convention
    const formData = new URLSearchParams();
    formData.append("username", credentials.email);
    formData.append("password", credentials.password);

    const response = await axios.post("/auth/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    // Cookie is set automatically by the browser (httponly)
    // Also fetch user data after login
    if (response.data) {
      await refreshUser();
    }
  };

  const signup = async (data: SignupData) => {
    await axios.post("/auth/register", data);
  };

  const googleLogin = async (credential: string) => {
    await axios.post("/auth/google", { credential });
    await refreshUser();
  };

  const logout = async () => {
    try {
      await axios.post("/auth/logout");
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, signup, googleLogin, logout, refreshUser }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};
