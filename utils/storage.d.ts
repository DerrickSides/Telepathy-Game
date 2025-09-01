// TypeScript declarations for storage module

export interface GameResult {
  matched: boolean;
  rounds: number;
  responseTime?: number;
  partnerId?: string;
  [key: string]: any;
}

export interface Settings {
  soundEnabled: boolean;
  hapticEnabled: boolean;
  adEnabled: boolean;
  premiumFeatures: boolean;
  notificationsEnabled: boolean;
}

export interface PremiumStatus {
  isPremium: boolean;
  expiryDate: string | null;
  updatedAt: string;
}

export interface TargetingData {
  [key: string]: any;
}

export class PlayerProfile {
  playerId: string;
  username: string;
  totalGames: number;
  matchedGames: number;
  averageRounds: number;
  responseTimings: number[];
  wordHistory: string[];
  partnerSuccess: Record<string, { games: number; matches: number }>;
  telepathyRating: number;
  createdAt: string;
  lastUpdated: string;
  isPremium: boolean;
  premiumExpiry: string | null;

  constructor(playerId: string, username: string);
  updateStats(gameResult: GameResult): void;
  calculateTelepathyRating(): number;
}

export function savePlayerProfile(profile: PlayerProfile): Promise<boolean>;
export function loadPlayerProfile(): Promise<PlayerProfile | null>;
export function saveGameHistory(gameHistory: any[]): Promise<boolean>;
export function loadGameHistory(): Promise<any[]>;
export function addGameToHistory(gameResult: GameResult): Promise<boolean>;
export function saveSettings(settings: Settings): Promise<boolean>;
export function loadSettings(): Promise<Settings>;
export function savePremiumStatus(isPremium: boolean, expiryDate?: string | null): Promise<boolean>;
export function loadPremiumStatus(): Promise<PremiumStatus>;
export function saveAdTargetingData(targetingData: TargetingData): Promise<boolean>;
export function loadAdTargetingData(): Promise<TargetingData[]>;
export function clearAllData(): Promise<boolean>;
export function getStorageSize(): Promise<number>;
export function migrateData(fromVersion: string, toVersion: string): Promise<boolean>;

export const STORAGE_KEYS: {
  PLAYER_PROFILE: string;
  GAME_HISTORY: string;
  SETTINGS: string;
  AD_TARGETING_DATA: string;
  PREMIUM_STATUS: string;
};
