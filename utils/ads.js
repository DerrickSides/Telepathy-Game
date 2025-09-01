// Ad integration utility for Telepathy game
// Phase 1 Implementation - Basic ads with future targeting preparation

// Ad configuration
const AD_CONFIG = {
  // Test ad unit IDs (replace with real ones for production)
  INTERSTITIAL_AD_UNIT_ID: __DEV__ 
    ? 'ca-app-pub-3940256099942544/1033173712' // Test ID
    : 'YOUR_INTERSTITIAL_AD_UNIT_ID', // Replace with your real ad unit ID
  
  BANNER_AD_UNIT_ID: __DEV__
    ? 'ca-app-pub-3940256099942544/6300978111' // Test ID
    : 'YOUR_BANNER_AD_UNIT_ID', // Replace with your real ad unit ID
  
  // Ad frequency settings
  MIN_TIME_BETWEEN_ADS: 30000, // 30 seconds
  MAX_ADS_PER_SESSION: 10,
  
  // Future targeting preparation
  ENABLE_TARGETING: false, // Set to true in Phase 5
  TARGETING_CATEGORIES: ['automotive', 'food', 'technology', 'nature', 'emotions']
};

// Ad state management
let adState = {
  lastAdTime: 0,
  adsShownThisSession: 0,
  isAdLoaded: false,
  isLoadingAd: false,
  adError: null
};

// Initialize ads (placeholder for future ad network integration)
export const initializeAds = async () => {
  try {
    console.log('Initializing ads...');
    
    // Future: Initialize ad network SDK here
    // Example: await AdMob.initialize(AD_CONFIG);
    
    // Load first interstitial ad
    await loadInterstitialAd();
    
    return true;
  } catch (error) {
    console.error('Error initializing ads:', error);
    return false;
  }
};

// Load interstitial ad
export const loadInterstitialAd = async (targetingParams = {}) => {
  try {
    if (adState.isLoadingAd) {
      console.log('Ad already loading...');
      return false;
    }
    
    adState.isLoadingAd = true;
    adState.adError = null;
    
    console.log('Loading interstitial ad...');
    
    // Future: Replace with actual ad network call
    // Example: await AdMob.loadInterstitial({
    //   adUnitId: AD_CONFIG.INTERSTITIAL_AD_UNIT_ID,
    //   targetingParams: targetingParams
    // });
    
    // Simulate ad loading for now
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    adState.isAdLoaded = true;
    adState.isLoadingAd = false;
    
    console.log('Interstitial ad loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading interstitial ad:', error);
    adState.isLoadingAd = false;
    adState.adError = error.message;
    return false;
  }
};

// Show interstitial ad
export const showInterstitialAd = async () => {
  try {
    const now = Date.now();
    
    // Check ad frequency limits
    if (now - adState.lastAdTime < AD_CONFIG.MIN_TIME_BETWEEN_ADS) {
      console.log('Ad shown too recently, skipping...');
      return false;
    }
    
    if (adState.adsShownThisSession >= AD_CONFIG.MAX_ADS_PER_SESSION) {
      console.log('Maximum ads per session reached');
      return false;
    }
    
    if (!adState.isAdLoaded) {
      console.log('No ad loaded, attempting to load...');
      const loaded = await loadInterstitialAd();
      if (!loaded) return false;
    }
    
    console.log('Showing interstitial ad...');
    
    // Future: Replace with actual ad network call
    // Example: await AdMob.showInterstitial();
    
    // Simulate ad showing for now
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Update ad state
    adState.lastAdTime = now;
    adState.adsShownThisSession++;
    adState.isAdLoaded = false;
    
    // Load next ad
    loadInterstitialAd();
    
    console.log('Interstitial ad shown successfully');
    return true;
  } catch (error) {
    console.error('Error showing interstitial ad:', error);
    adState.adError = error.message;
    return false;
  }
};

// Show ad between rounds
export const showAdBetweenRounds = async (roundNumber, wordAnalysis = null) => {
  try {
    // Don't show ads too frequently
    if (roundNumber < 2) {
      return false;
    }
    
    // Show ad every 3 rounds
    if (roundNumber % 3 !== 0) {
      return false;
    }
    
    // Future: Use word analysis for targeting
    let targetingParams = {};
    if (AD_CONFIG.ENABLE_TARGETING && wordAnalysis) {
      targetingParams = {
        category: wordAnalysis.primaryCategory,
        subcategory: wordAnalysis.secondaryCategory,
        confidence: wordAnalysis.confidence
      };
    }
    
    return await showInterstitialAd();
  } catch (error) {
    console.error('Error showing ad between rounds:', error);
    return false;
  }
};

// Show ad after game completion
export const showAdAfterGame = async (gameResult = null) => {
  try {
    // Future: Use game result for targeting
    let targetingParams = {};
    if (AD_CONFIG.ENABLE_TARGETING && gameResult) {
      targetingParams = {
        gameDuration: gameResult.duration,
        matchRate: gameResult.matchRate,
        totalRounds: gameResult.totalRounds
      };
    }
    
    return await showInterstitialAd();
  } catch (error) {
    console.error('Error showing ad after game:', error);
    return false;
  }
};

// Banner ad component (placeholder)
export const BannerAd = ({ style = {} }) => {
  // Future: Replace with actual banner ad component
  return null;
};

// Check if ads are enabled
export const areAdsEnabled = () => {
  // Future: Check user's premium status and ad preferences
  return true;
};

// Get ad state for debugging
export const getAdState = () => {
  return { ...adState };
};

// Reset ad state (for new sessions)
export const resetAdState = () => {
  adState = {
    lastAdTime: 0,
    adsShownThisSession: 0,
    isAdLoaded: false,
    isLoadingAd: false,
    adError: null
  };
};

// Future enhancement: Word-based ad targeting
export const getAdTargetingFromWords = (word1, word2) => {
  if (!AD_CONFIG.ENABLE_TARGETING) {
    return {};
  }
  
  // Simple category detection (enhanced in Phase 5)
  const categories = [];
  
  [word1, word2].forEach(word => {
    const normalized = word.toLowerCase().trim();
    
    // Basic category mapping
    if (['car', 'truck', 'vehicle', 'drive'].includes(normalized)) {
      categories.push('automotive');
    } else if (['pizza', 'burger', 'food', 'eat'].includes(normalized)) {
      categories.push('food');
    } else if (['computer', 'phone', 'tech', 'digital'].includes(normalized)) {
      categories.push('technology');
    }
  });
  
  return {
    primaryCategory: categories[0] || 'general',
    secondaryCategory: categories[1] || categories[0] || 'general',
    confidence: categories.length > 0 ? 0.8 : 0.3
  };
};

// Ad revenue tracking (for analytics)
export const trackAdRevenue = (adType, revenue, currency = 'USD') => {
  try {
    const adEvent = {
      type: adType,
      revenue,
      currency,
      timestamp: new Date().toISOString(),
      sessionId: Date.now().toString()
    };
    
    // Future: Send to analytics service
    console.log('Ad revenue tracked:', adEvent);
    
    return true;
  } catch (error) {
    console.error('Error tracking ad revenue:', error);
    return false;
  }
};

// Export configuration for external use
export { AD_CONFIG };
