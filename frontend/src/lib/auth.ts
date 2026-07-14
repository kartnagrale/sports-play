"use client";

import { create } from "zustand";
import { api, UserInfo } from "./api";

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  hydrated: boolean;
  hydrate: () => void;
  login: (email: string, password: string) => Promise<UserInfo>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  hydrated: false,
  hydrate: () => {
    if (typeof window === "undefined") return;
    const t = localStorage.getItem("neml_token");
    const uRaw = localStorage.getItem("neml_user");
    let u: UserInfo | null = null;
    try {
      u = uRaw ? JSON.parse(uRaw) : null;
    } catch {}
    set({ token: t, user: u, hydrated: true });
  },
  login: async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("neml_token", data.token);
    localStorage.setItem("neml_user", JSON.stringify(data.user));
    set({ token: data.token, user: data.user });
    return data.user;
  },
  logout: () => {
    localStorage.removeItem("neml_token");
    localStorage.removeItem("neml_user");
    set({ token: null, user: null });
  },
}));
