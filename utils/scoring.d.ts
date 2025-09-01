// TypeScript declarations for scoring module

export interface MatchQuality {
  score: number;
  type: 'exact' | 'first_letter' | 'category' | 'semantic' | 'none';
  category: string;
}

export interface WordRarity {
  score: number;
  rarity: 'very_rare' | 'rare' | 'common';
}

export interface SimultaneityScore {
  score: number;
  type: 'same_second' | 'within_3_seconds' | 'within_10_seconds' | 'delayed';
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface WordAnalysis {
  primaryCategory: string;
  secondaryCategory: string;
  confidence: number;
}

export interface RoundResult {
  round: number;
  player1_word: string;
  player2_word: string;
  words_match: boolean;
  matchQuality: MatchQuality;
  simultaneityScore: SimultaneityScore;
  wordRarity: number;
  telepathyRating: number;
  timestamp: number;
}

export interface SessionSummary {
  sessionCode: string;
  totalRounds: number;
  matches: number;
  matchRate: number;
  averageRating: number;
  duration: number;
  adTargetingData: Array<{
    round: number;
    categories: string[];
    timestamp: number;
  }>;
}

export class GameSessionTracker {
  constructor(sessionCode: string);
  recordSubmission(playerId: string, word: string, timestamp: number): void;
  processRound(): void;
  getSessionSummary(): SessionSummary;
}

export function calculateMatchQuality(word1: string, word2: string): MatchQuality;
export function calculateWordRarity(word: string): WordRarity;
export function calculateSimultaneityScore(timestamp1: number, timestamp2: number): SimultaneityScore;
export function calculateTelepathyRating(matchQuality: number, simultaneityScore: number, wordRarity: number, consistencyFactor?: number): number;
export function validateSubmission(word: string, responseTime: number): ValidationResult;
export function analyzeWordsForAds(word1: string, word2: string): WordAnalysis;

export const COMMON_WORDS: string[];
export const UNCOMMON_WORDS: string[];
export const WORD_CATEGORIES: Record<string, string[]>;
