"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { hydrateData } from "./sync";
import { useRouter, usePathname } from "next/navigation";
import type { Business } from "@/types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  business: Business | null;
  loading: boolean;
  refreshBusiness: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  business: null,
  loading: true,
  refreshBusiness: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchBusiness = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("owner_id", userId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching business:", error);
      }
      
      setBusiness(data || null);
      return data;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(session);
          setUser(session?.user || null);
          
          if (session?.user) {
            await fetchBusiness(session.user.id);
          }
        }
      } catch (error) {
        console.error("Session error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        
        setSession(currentSession);
        setUser(currentSession?.user || null);
        
        if (event === "SIGNED_IN" && currentSession?.user) {
          setLoading(true);
          try {
            const businessData = await fetchBusiness(currentSession.user.id);
            if (businessData) {
              await hydrateData(businessData.id);
            }
          } catch (e) {
            console.error("Hydration error:", e);
          } finally {
            setLoading(false);
          }
        } else if (event === "SIGNED_OUT") {
          setBusiness(null);
          router.push("/login");
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshBusiness = async () => {
    if (user) await fetchBusiness(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, session, business, loading, refreshBusiness, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
