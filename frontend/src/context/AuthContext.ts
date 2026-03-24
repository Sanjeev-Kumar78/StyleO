import { createContext } from "react";

export type User = {
  _id: string;
  username: string;
  email: string;
  provider?: "local" | "google";
  created_at: string;
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
