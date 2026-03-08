"use client";

import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";
import type { Business } from "@/types";

interface AuthContextType {
  user: User | null;
  business: Business | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  business: null,
});

export function AuthProvider({ 
  children, 
  user,
  business
}: { 
  children: React.ReactNode;
  user: User | null;
  business: Business | null;
}) {
  return (
    <AuthContext.Provider value={{ user, business }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
