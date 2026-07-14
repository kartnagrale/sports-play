import axios, { AxiosInstance } from "axios";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8001";

export const API_BASE = `${BACKEND_URL}/api`;
export const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || BACKEND_URL;

// httpOnly cookie is set by the backend on /api/auth/login. `withCredentials: true`
// ensures axios sends it on every subsequent cross-origin request. No token is
// ever stored in localStorage or accessible to JS on the client — this defends
// against XSS token theft.
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  withCredentials: true,
});

api.interceptors.response.use(
  (r) => r,
  (err) => Promise.reject(err)
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
  bidDeadline?: string | null;
  timerSeconds?: number | null;
}

export interface StandingDto {
  team: { id: string; name: string; shortCode: string; primaryColor: string };
  played: number;
  won: number;
  lost: number;
  formatWins: number;
  formatLosses: number;
  formatDiff: number;
  basePoints: number;
  penalty: number;
  totalPoints: number;
  rank: number;
  unplayedPlayerIds: string[];
}

export interface FormatLeaderDto {
  formatType: string;
  leadingTeam?: { id: string; name: string; shortCode: string; primaryColor: string } | null;
  wins: number;
  allTeams: { team: { id: string; name: string; shortCode: string; primaryColor: string }; wins: number }[];
}

export interface TeamAnalysisDto {
  team: { id: string; name: string; shortCode: string; primaryColor: string };
  played: number;
  won: number;
  lost: number;
  winPct: number;
  participationCount: number;
  squadSize: number;
  participationPct: number;
  unplayedPlayerIds: string[];
  strongestFormat?: string | null;
  weakestFormat?: string | null;
  formatBreakdown: { formatType: string; won: number; lost: number }[];
  headToHead: { opponent: { id: string; name: string; shortCode: string; primaryColor: string }; played: number; won: number; lost: number }[];
}

export interface TopPerformerDto {
  player: { id: string; fullName: string; gender: string; teamId: string };
  team: { id: string; name: string; shortCode: string; primaryColor: string };
  matchesPlayed: number;
  wins: number;
  losses: number;
  winPct: number;
  longestStreak: number;
  totalPointsWon: number;
  avgMargin: number;
}

export interface MatchFormatDto {
  id: string;
  formatType: string;
  formatOrder: number;
  sideAPlayers: { id: string; fullName: string; gender: string; teamId: string }[];
  sideBPlayers: { id: string; fullName: string; gender: string; teamId: string }[];
  scoreA: number;
  scoreB: number;
  winner?: { id: string; name: string; shortCode: string; primaryColor: string } | null;
  completed: boolean;
}

export interface MatchDto {
  id: string;
  matchNumber: number;
  teamA: { id: string; name: string; shortCode: string; primaryColor: string };
  teamB: { id: string; name: string; shortCode: string; primaryColor: string };
  scheduledAt: string;
  status: "SCHEDULED" | "LIVE" | "COMPLETED";
  winner?: { id: string; name: string; shortCode: string; primaryColor: string } | null;
  teamAFormatWins: number;
  teamBFormatWins: number;
  venue?: string;
  formats: MatchFormatDto[];
}

export const FORMAT_LABEL: Record<string, string> = {
  MENS_SINGLES: "Men's Singles",
  WOMENS_SINGLES: "Women's Singles",
  MENS_DOUBLES: "Men's Doubles",
  MIXED_DOUBLES: "Mixed Doubles",
  MENS_DOUBLES_TWO: "Men's Doubles II",
};

export const FORMAT_SHORT: Record<string, string> = {
  MENS_SINGLES: "MS",
  WOMENS_SINGLES: "WS",
  MENS_DOUBLES: "MD",
  MIXED_DOUBLES: "XD",
  MENS_DOUBLES_TWO: "MD2",
};
