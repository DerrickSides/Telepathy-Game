// Core Telepathy Scoring System
// Phase 1 Implementation - Basic scoring with future ad targeting preparation

// Word frequency data for rarity scoring
const COMMON_WORDS = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us'
];

const UNCOMMON_WORDS = [
  'serendipity', 'ephemeral', 'mellifluous', 'petrichor', 'aurora', 'cascade', 'labyrinth', 'serenity', 'ethereal', 'luminescent',
  'whimsical', 'enigmatic', 'resplendent', 'tranquil', 'mystical', 'radiant', 'celestial', 'harmonious', 'effervescent', 'mesmerizing',
  'sublime', 'enchanting', 'majestic', 'pristine', 'timeless', 'infinite', 'cosmic', 'stellar', 'nebula', 'galaxy',
  'phoenix', 'dragon', 'unicorn', 'mermaid', 'fairy', 'wizard', 'knight', 'princess', 'castle', 'kingdom',
  'adventure', 'journey', 'quest', 'treasure', 'magic', 'spell', 'potion', 'crystal', 'gem', 'diamond'
];

// Word categories for semantic matching (future ad targeting preparation)
const WORD_CATEGORIES = {
  automotive: ['car', 'truck', 'vehicle', 'drive', 'road', 'travel', 'transport', 'engine', 'wheel', 'speed'],
  food: ['pizza', 'burger', 'restaurant', 'cooking', 'dining', 'meal', 'food', 'eat', 'hungry', 'delicious'],
  technology: ['computer', 'phone', 'app', 'digital', 'online', 'internet', 'software', 'device', 'screen', 'tech'],
  nature: ['tree', 'flower', 'ocean', 'mountain', 'river', 'forest', 'sky', 'sun', 'moon', 'star'],
  emotions: ['love', 'hate', 'joy', 'sadness', 'anger', 'fear', 'surprise', 'happiness', 'excitement', 'calm'],
  colors: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'black', 'white', 'gray'],
  animals: ['cat', 'dog', 'bird', 'fish', 'lion', 'tiger', 'elephant', 'giraffe', 'monkey', 'bear'],
  places: ['home', 'school', 'work', 'park', 'beach', 'city', 'country', 'world', 'universe', 'space']
};

// Core scoring functions
export const calculateMatchQuality = (word1, word2) => {
  const w1 = word1.toLowerCase().trim();
  const w2 = word2.toLowerCase().trim();

  // Exact match
  if (w1 === w2) {
    return { score: 1000, type: 'exact', category: getWordCategory(w1) };
  }

  // First letter match
  if (w1.charAt(0) === w2.charAt(0)) {
    return { score: 100, type: 'first_letter', category: getWordCategory(w1) };
  }

  // Category match
  for (const [category, words] of Object.entries(WORD_CATEGORIES)) {
    if (words.includes(w1) && words.includes(w2)) {
      return { score: 500, type: 'category', category };
    }
  }

  // Semantic similarity (simple word comparison)
  const similarity = calculateWordSimilarity(w1, w2);
  if (similarity > 0.7) {
    return { score: 750, type: 'semantic', category: getWordCategory(w1) };
  }

  return { score: 0, type: 'none', category: 'general' };
};

const calculateWordSimilarity = (word1, word2) => {
  // Simple similarity calculation based on common letters
  const letters1 = new Set(word1.split(''));
  const letters2 = new Set(word2.split(''));
  
  const intersection = new Set([...letters1].filter(x => letters2.has(x)));
  const union = new Set([...letters1, ...letters2]);
  
  return intersection.size / union.size;
};

export const calculateWordRarity = (word) => {
  const normalizedWord = word.toLowerCase().trim();
  
  if (UNCOMMON_WORDS.includes(normalizedWord)) {
    return { score: 500, rarity: 'very_rare' };
  }
  
  if (!COMMON_WORDS.includes(normalizedWord)) {
    return { score: 200, rarity: 'rare' };
  }
  
  return { score: 0, rarity: 'common' };
};

export const calculateSimultaneityScore = (timestamp1, timestamp2) => {
  const timeDiff = Math.abs(timestamp2 - timestamp1);
  
  if (timeDiff <= 1000) { // Same second
    return { score: 500, type: 'same_second' };
  } else if (timeDiff <= 3000) { // Within 3 seconds
    return { score: 300, type: 'within_3_seconds' };
  } else if (timeDiff <= 10000) { // Within 10 seconds
    return { score: 100, type: 'within_10_seconds' };
  }
  
  return { score: 0, type: 'delayed' };
};

export const calculateTelepathyRating = (matchQuality, simultaneityScore, wordRarity, consistencyFactor = 50) => {
  return Math.round(
    (matchQuality * 40) + 
    (simultaneityScore * 30) + 
    (wordRarity * 20) + 
    (consistencyFactor * 10)
  );
};

// Utility functions
const getWordCategory = (word) => {
  const normalizedWord = word.toLowerCase().trim();
  
  for (const [category, words] of Object.entries(WORD_CATEGORIES)) {
    if (words.includes(normalizedWord)) {
      return category;
    }
  }
  
  return 'general';
};

export const validateSubmission = (word, responseTime) => {
  const errors = [];
  
  // Minimum response time requirement
  if (responseTime < 3000) {
    errors.push('Response too fast - minimum 3 seconds required');
  }
  
  // Word validation
  if (!word || word.trim().length < 2) {
    errors.push('Word must be at least 2 characters long');
  }
  
  if (word.length > 20) {
    errors.push('Word must be 20 characters or less');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Future ad targeting preparation
export const analyzeWordsForAds = (word1, word2) => {
  const categories = [];
  
  [word1, word2].forEach(word => {
    const category = getWordCategory(word);
    if (category !== 'general' && !categories.includes(category)) {
      categories.push(category);
    }
  });
  
  return {
    primaryCategory: categories[0] || 'general',
    secondaryCategory: categories[1] || categories[0] || 'general',
    confidence: categories.length > 0 ? 0.8 : 0.3
  };
};

// Game session tracking for future enhancements
export class GameSessionTracker {
  constructor(sessionCode) {
    this.sessionCode = sessionCode;
    this.startTime = Date.now();
    this.player1Submission = null;
    this.player2Submission = null;
    this.roundNumber = 1;
    this.wordHistory = [];
    this.adTargetingData = []; // Future enhancement
  }

  recordSubmission(playerId, word, timestamp) {
    const submission = {
      playerId,
      word: word.toLowerCase().trim(),
      timestamp,
      roundNumber: this.roundNumber,
      category: getWordCategory(word)
    };

    if (!this.player1Submission) {
      this.player1Submission = submission;
    } else {
      this.player2Submission = submission;
      this.processRound();
    }
  }

  processRound() {
    if (!this.player1Submission || !this.player2Submission) return;

    const matchQuality = calculateMatchQuality(
      this.player1Submission.word, 
      this.player2Submission.word
    );
    
    const simultaneityScore = calculateSimultaneityScore(
      this.player1Submission.timestamp,
      this.player2Submission.timestamp
    );
    
    const wordRarity1 = calculateWordRarity(this.player1Submission.word);
    const wordRarity2 = calculateWordRarity(this.player2Submission.word);
    const avgWordRarity = (wordRarity1.score + wordRarity2.score) / 2;

    const roundResult = {
      round: this.roundNumber,
      player1_word: this.player1Submission.word,
      player2_word: this.player2Submission.word,
      words_match: matchQuality.type === 'exact',
      matchQuality,
      simultaneityScore,
      wordRarity: avgWordRarity,
      telepathyRating: calculateTelepathyRating(
        matchQuality.score,
        simultaneityScore.score,
        avgWordRarity
      ),
      timestamp: Date.now()
    };

    this.wordHistory.push(roundResult);
    
    // Future: Store ad targeting data
    this.adTargetingData.push({
      round: this.roundNumber,
      categories: [this.player1Submission.category, this.player2Submission.category],
      timestamp: Date.now()
    });

    // Reset for next round
    this.player1Submission = null;
    this.player2Submission = null;
    this.roundNumber++;
  }

  getSessionSummary() {
    const totalRounds = this.wordHistory.length;
    const matches = this.wordHistory.filter(r => r.words_match).length;
    const avgRating = this.wordHistory.reduce((sum, r) => sum + r.telepathyRating, 0) / totalRounds;
    
    return {
      sessionCode: this.sessionCode,
      totalRounds,
      matches,
      matchRate: totalRounds > 0 ? (matches / totalRounds) * 100 : 0,
      averageRating: Math.round(avgRating),
      duration: Date.now() - this.startTime,
      adTargetingData: this.adTargetingData // Future enhancement
    };
  }
}

// Export constants for future use
export { COMMON_WORDS, UNCOMMON_WORDS, WORD_CATEGORIES };
