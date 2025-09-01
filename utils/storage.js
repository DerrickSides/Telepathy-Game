// Storage utility for player statistics and game data
// Phase 1 Implementation - Basic storage with future enhancement preparation

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  PLAYER_PROFILE: 'telepathy_player_profile',
  GAME_HISTORY: 'telepathy_game_history',
  SETTINGS: 'telepathy_settings',
  AD_TARGETING_DATA: 'telepathy_ad_targeting_data', // Future enhancement
  PREMIUM_STATUS: 'telepathy_premium_status'
};

// Player Profile Data Structure
export class PlayerProfile {
  constructor(playerId, username) {
    this.playerId = playerId;
    this.username = username;
    this.totalGames = 0;
    this.matchedGames = 0;
    this.averageRounds = 0;
    this.responseTimings = [];
    this.wordHistory = [];
    this.partnerSuccess = {};
    this.telepathyRating = 0;
    this.createdAt = new Date().toISOString();
    this.lastUpdated = new Date().toISOString();
    this.isPremium = false;
    this.premiumExpiry = null;
  }

  updateStats(gameResult) {
    this.totalGames++;
    if (gameResult.matched) {
      this.matchedGames++;
    }
    
    // Update average rounds
    const totalRounds = this.wordHistory.length + gameResult.rounds;
    this.averageRounds = totalRounds / this.totalGames;
    
    // Add response timings
    if (gameResult.responseTime) {
      this.responseTimings.push(gameResult.responseTime);
    }
    
    // Update partner success rate
    if (gameResult.partnerId) {
      if (!this.partnerSuccess[gameResult.partnerId]) {
        this.partnerSuccess[gameResult.partnerId] = { games: 0, matches: 0 };
      }
      this.partnerSuccess[gameResult.partnerId].games++;
      if (gameResult.matched) {
        this.partnerSuccess[gameResult.partnerId].matches++;
      }
    }
    
    this.lastUpdated = new Date().toISOString();
  }

  calculateTelepathyRating() {
    const matchSuccessRate = this.totalGames > 0 ? (this.matchedGames / this.totalGames) * 100 : 0;
    const avgResponseTime = this.responseTimings.length > 0 ? 
      this.responseTimings.reduce((a, b) => a + b, 0) / this.responseTimings.length : 0;
    
    // Simplified rating calculation
    this.telepathyRating = Math.round(
      (matchSuccessRate * 0.4) + 
      (Math.max(0, 100 - avgResponseTime) * 0.3) + 
      (Math.min(100, this.averageRounds * 10) * 0.2) + 
      (Math.min(100, Object.keys(this.partnerSuccess).length * 5) * 0.1)
    );
    
    return this.telepathyRating;
  }
}

// Storage utility functions
export const savePlayerProfile = async (profile) => {
  try {
    const profileData = JSON.stringify(profile);
    await AsyncStorage.setItem(STORAGE_KEYS.PLAYER_PROFILE, profileData);
    return true;
  } catch (error) {
    console.error('Error saving player profile:', error);
    return false;
  }
};

export const loadPlayerProfile = async () => {
  try {
    const profileData = await AsyncStorage.getItem(STORAGE_KEYS.PLAYER_PROFILE);
    if (profileData) {
      const profile = JSON.parse(profileData);
      // Reconstruct PlayerProfile object with methods
      const playerProfile = new PlayerProfile(profile.playerId, profile.username);
      Object.assign(playerProfile, profile);
      return playerProfile;
    }
    return null;
  } catch (error) {
    console.error('Error loading player profile:', error);
    return null;
  }
};

export const saveGameHistory = async (gameHistory) => {
  try {
    const historyData = JSON.stringify(gameHistory);
    await AsyncStorage.setItem(STORAGE_KEYS.GAME_HISTORY, historyData);
    return true;
  } catch (error) {
    console.error('Error saving game history:', error);
    return false;
  }
};

export const loadGameHistory = async () => {
  try {
    const historyData = await AsyncStorage.getItem(STORAGE_KEYS.GAME_HISTORY);
    return historyData ? JSON.parse(historyData) : [];
  } catch (error) {
    console.error('Error loading game history:', error);
    return [];
  }
};

export const addGameToHistory = async (gameResult) => {
  try {
    const history = await loadGameHistory();
    const newGame = {
      ...gameResult,
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    };
    history.unshift(newGame); // Add to beginning
    
    // Keep only last 100 games to prevent storage bloat
    if (history.length > 100) {
      history.splice(100);
    }
    
    await saveGameHistory(history);
    return true;
  } catch (error) {
    console.error('Error adding game to history:', error);
    return false;
  }
};

export const saveSettings = async (settings) => {
  try {
    const settingsData = JSON.stringify(settings);
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, settingsData);
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
};

export const loadSettings = async () => {
  try {
    const settingsData = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    return settingsData ? JSON.parse(settingsData) : getDefaultSettings();
  } catch (error) {
    console.error('Error loading settings:', error);
    return getDefaultSettings();
  }
};

const getDefaultSettings = () => ({
  soundEnabled: true,
  hapticEnabled: true,
  adEnabled: true, // For future ad targeting
  premiumFeatures: false,
  notificationsEnabled: true
});

export const savePremiumStatus = async (isPremium, expiryDate = null) => {
  try {
    const premiumData = {
      isPremium,
      expiryDate,
      updatedAt: new Date().toISOString()
    };
    await AsyncStorage.setItem(STORAGE_KEYS.PREMIUM_STATUS, JSON.stringify(premiumData));
    return true;
  } catch (error) {
    console.error('Error saving premium status:', error);
    return false;
  }
};

export const loadPremiumStatus = async () => {
  try {
    const premiumData = await AsyncStorage.getItem(STORAGE_KEYS.PREMIUM_STATUS);
    if (premiumData) {
      const data = JSON.parse(premiumData);
      // Check if premium has expired
      if (data.expiryDate && new Date(data.expiryDate) < new Date()) {
        await savePremiumStatus(false, null);
        return { isPremium: false, expiryDate: null };
      }
      return data;
    }
    return { isPremium: false, expiryDate: null };
  } catch (error) {
    console.error('Error loading premium status:', error);
    return { isPremium: false, expiryDate: null };
  }
};

// Future enhancement: Ad targeting data storage
export const saveAdTargetingData = async (targetingData) => {
  try {
    const existingData = await AsyncStorage.getItem(STORAGE_KEYS.AD_TARGETING_DATA);
    const data = existingData ? JSON.parse(existingData) : [];
    data.push({
      ...targetingData,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 1000 entries
    if (data.length > 1000) {
      data.splice(0, data.length - 1000);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.AD_TARGETING_DATA, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving ad targeting data:', error);
    return false;
  }
};

export const loadAdTargetingData = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.AD_TARGETING_DATA);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading ad targeting data:', error);
    return [];
  }
};

// Utility functions
export const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    return true;
  } catch (error) {
    console.error('Error clearing all data:', error);
    return false;
  }
};

export const getStorageSize = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    let totalSize = 0;
    
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      totalSize += value ? value.length : 0;
    }
    
    return totalSize;
  } catch (error) {
    console.error('Error calculating storage size:', error);
    return 0;
  }
};

// Data migration utility for future updates
export const migrateData = async (fromVersion, toVersion) => {
  try {
    console.log(`Migrating data from version ${fromVersion} to ${toVersion}`);
    
    // Add migration logic here as needed
    // Example: Convert old data format to new format
    
    return true;
  } catch (error) {
    console.error('Error during data migration:', error);
    return false;
  }
};

export { STORAGE_KEYS };
