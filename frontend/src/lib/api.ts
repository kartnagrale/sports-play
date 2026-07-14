import axios, { AxiosInstance } from "axios";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001";

export const API_BASE = `${BACKEND_URL}/api`;
export const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || BACKEND_URL;

function tokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("neml_token");
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const t = tokenFromStorage();
  if (t) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${t}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("neml_token");
      localStorage.removeItem("neml_user");
    }
    return Promise.reject(err);
  }
);

export type Role = "ADMIN" | "TEAM_OWNER" | "VIEWER";

export interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  teamId?: string | null;
  teamName?: string | null;
}

export interface TeamDto {
  id: string;
  name: string;
  shortCode: string;
  logoUrl: string;
  primaryColor: string;
  purseTotal: number;
  purseRemaining: number;
  maleCount: number;
  femaleCount: number;
  totalPlayers: number;
}

export interface PlayerDto {
  id: string;
  fullName: string;
  gender: "MALE" | "FEMALE";
  basePrice: number;
  soldPrice?: number | null;
  status: "AVAILABLE" | "ON_BLOCK" | "SOLD" | "UNSOLD";
  teamId?: string | null;
  teamName?: string | null;
  skillLevel?: string;
  auctionOrder?: number;
}

export interface BidDto {
  id: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  amount: number;
  createdAt: string;
  active: boolean;
}

export interface AuctionStateDto {
  status: "NOT_STARTED" | "RUNNING" | "PAUSED" | "COMPLETED";
  currentPlayer?: PlayerDto | null;
  highestBid?: BidDto | null;
  bidHistory: BidDto[];
  teams: TeamDto[];
  remainingPlayers: number;
}
