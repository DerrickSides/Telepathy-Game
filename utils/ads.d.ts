// TypeScript declarations for ads module

export interface AdConfig {
  INTERSTITIAL_AD_UNIT_ID: string;
  BANNER_AD_UNIT_ID: string;
  MIN_TIME_BETWEEN_ADS: number;
  MAX_ADS_PER_SESSION: number;
  ENABLE_TARGETING: boolean;
  TARGETING_CATEGORIES: string[];
}

export interface AdState {
  lastAdTime: number;
  adsShownThisSession: number;
  isAdLoaded: boolean;
  isLoadingAd: boolean;
  adError: string | null;
}

export interface WordAnalysis {
  primaryCategory: string;
  secondaryCategory: string;
  confidence: number;
}

export interface GameResult {
  duration: number;
  matchRate: number;
  totalRounds: number;
  [key: string]: any;
}

export interface AdEvent {
  type: string;
  revenue: number;
  currency: string;
  timestamp: string;
  sessionId: string;
}

export function initializeAds(): Promise<boolean>;
export function loadInterstitialAd(targetingParams?: Record<string, any>): Promise<boolean>;
export function showInterstitialAd(): Promise<boolean>;
export function showAdBetweenRounds(roundNumber: number, wordAnalysis?: WordAnalysis | null): Promise<boolean>;
export function showAdAfterGame(gameResult?: GameResult | null): Promise<boolean>;
export function areAdsEnabled(): boolean;
export function getAdState(): AdState;
export function resetAdState(): void;
export function getAdTargetingFromWords(word1: string, word2: string): WordAnalysis;
export function trackAdRevenue(adType: string, revenue: number, currency?: string): boolean;

export const AD_CONFIG: AdConfig;
