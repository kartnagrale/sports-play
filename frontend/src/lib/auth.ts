"use client";

import { create } from "zustand";
import { api, UserInfo } from "./api";

/**
 * Auth state lives only in memory. The JWT is delivered by the server via an
 * httpOnly cookie (`neml_auth`) that JS cannot read — so nothing is persisted
 * to localStorage. On page load we call /api/auth/me; if the cookie is valid
 * the server returns the user, otherwise we treat them as logged out.
 */
interface AuthState {
  user: UserInfo | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<UserInfo>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await api.get<UserInfo>("/auth/me");
      set({ user: data, hydrated: true });
    } catch (error) {
      // 401 (unauthenticated) is expected when there's no cookie yet.
      // Anything else is unexpected but non-fatal — log for debugging.
      if ((error as any)?.response?.status !== 401) {
        console.warn("Auth hydrate failed:", error);
      }
      set({ user: null, hydrated: true });
    }
  },
  login: async (email, password) => {
    // Server sets the httpOnly cookie on success; we still get the user info back.
    const { data } = await api.post<{ token: string; user: UserInfo }>("/auth/login", { email, password });
    set({ user: data.user });
    return data.user;
  },
  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      // Failure to reach server shouldn't block client-side logout.
      console.warn("Server logout failed, clearing local state anyway:", error);
    }
    set({ user: null });
  },
}));
