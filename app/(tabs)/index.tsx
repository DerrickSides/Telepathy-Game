// TelepathyGame.tsx - Complete Firebase Multiplayer Version with Advanced Scoring
// Phase 1 Implementation

// import { Audio } from 'expo-av'; // Temporarily disabled
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { initializeApp } from 'firebase/app';
import { getDatabase, off, onValue, ref, set, update } from 'firebase/database';
import React, { useEffect, useRef, useState } from 'react';

// Import new scoring and storage utilities
import {
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  Linking,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import {
  initializeAds
} from '../../utils/ads';
import {
  GameSessionTracker,
  validateSubmission
} from '../../utils/scoring';
import {
  PlayerProfile,
  loadPlayerProfile,
  loadPremiumStatus,
  loadSettings
} from '../../utils/storage';

// TODO: Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBHooqzW6MO5CyKGXQGoxq0CS5UqK2PWAU",
  authDomain: "telepathy-game-7dc55.firebaseapp.com",
  databaseURL: "https://telepathy-game-7dc55-default-rtdb.firebaseio.com",
  projectId: "telepathy-game-7dc55",
  storageBucket: "telepathy-game-7dc55.firebasestorage.app",
  messagingSenderId: "263548979670",
  appId: "1:263548979670:web:8d175ccd12399c7347bc77",
  measurementId: "G-LV84RMZWGR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Type definitions
interface GameSession {
  session_code: string;
  player1_id: string;
  player2_id: string | null;
  player1_username: string;
  player2_username: string | null;
  game_status: string;
  round_number: number;
  player1_word: string;
  player2_word: string;
  player1_ready: boolean;
  player2_ready: boolean;
  word_history: Array<{
    round: number;
    player1_word: string;
    player2_word: string;
    words_match: boolean;
  }>;
  created_at: string;
}

export default function TelepathyGame() {
  // Get screen dimensions for responsive design
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  // Calculate responsive font size for title
  const getResponsiveFontSize = () => {
    // Use a larger percentage and ensure it fits the screen width
    const maxWidth = screenWidth - 40; // Account for padding
    const baseSize = Math.min(screenWidth * 0.12, screenHeight * 0.08); // Better proportions
    const minSize = 36; // Increased minimum font size
    const maxSize = 64; // Slightly reduced maximum
    return Math.max(minSize, Math.min(maxSize, baseSize));
  };

  // Calculate responsive font size for subtitle
  const getResponsiveSubtitleSize = () => {
    const baseSize = Math.max(screenWidth * 0.04, 16); // Minimum 16px
    const maxSize = 24; // Maximum subtitle size
    return Math.min(baseSize, maxSize);
  };


  
  // Core game state
  const [gameState, setGameState] = useState('title');
  const [username, setUsername] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [countdown, setCountdown] = useState(0);
  
  // New Phase 1 state variables
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [gameSessionTracker, setGameSessionTracker] = useState<GameSessionTracker | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [premiumStatus, setPremiumStatus] = useState<{ isPremium: boolean; expiryDate: string | null }>({ isPremium: false, expiryDate: null });
  const [wordSubmissionTime, setWordSubmissionTime] = useState(0);
  
  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  
  // Animation values
  const titleScale = useRef(new Animated.Value(0.5)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;
  

  
  // Game input state
  const [currentWord, setCurrentWord] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
  // Rematch state
  const [rematchRequested, setRematchRequested] = useState(false);
  const [rematchInitiator, setRematchInitiator] = useState('');
  
  // Game statistics
  const [showStats, setShowStats] = useState(false);
  
  // Real-time listener refs
  const gameListenerRef = useRef<any>(null);
  const countdownRef = useRef<number | null>(null);

  useEffect(() => {
    initializeUser();
    initializeAppData();
    
    // Handle incoming deep links
    const handleDeepLink = (url: string) => {
      console.log('Deep link received:', url);
      if (url) {
        // Handle both old format (telepathy://join/CODE) and new Universal Links (https://domain.com/join/CODE)
        let match: RegExpMatchArray | null = url.match(/\/join\/([A-Z0-9-]+)/);
        
        // If no match in path, try to extract from the full URL
        if (!match) {
          try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            const lastPart = pathParts[pathParts.length - 1];
            if (lastPart && lastPart !== 'index.html' && lastPart !== '') {
              // Create a match array manually for the extracted code
              match = [url, lastPart, lastPart];
            }
          } catch (e) {
            console.log('Error parsing URL:', e);
          }
        }
        
        console.log('URL match:', match);
        if (match && match[1]) {
          const gameCode = match[1];
          console.log('Extracted game code:', gameCode);
          setJoinCode(gameCode);
          
          // If user hasn't set username yet, prompt them first
          if (!username) {
            setGameState('username');
          } else {
            setGameState('join');
          }
        }
      }
    };

    // Listen for incoming links
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Auto-join game if code was provided via deep link
    if (joinCode && gameState === 'join') {
      // Small delay to ensure username is set
      setTimeout(() => {
        if (username) {
          handleJoinGame();
        }
      }, 1000);
    }

    return () => {
      // Cleanup listeners on unmount
      if (gameListenerRef.current) {
        off(gameListenerRef.current);
      }
      subscription?.remove();
    };
  }, []);

  // Animation effect for title screen
  useEffect(() => {
    if (gameState === 'title') {
      // Animate title entrance (native driver)
      Animated.parallel([
        Animated.timing(titleScale, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 1200,
          delay: 400,
          useNativeDriver: true,
        }),
      ]).start();
      

    }
  }, [gameState]);

  // Listen for screen dimension changes (orientation changes)
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', () => {
      // Force re-render when screen dimensions change
      // The getResponsiveFontSize function will automatically use new dimensions
    });

    return () => subscription?.remove();
  }, []);

  // Handle game state transitions based on game session updates
  useEffect(() => {
    if (gameSession) {
      console.log('Game session updated, current state:', gameState, 'session:', gameSession);
      
      // Check if player 2 joined and we're still in create state
      if (gameSession.player2_id && gameSession.game_status === 'playing' && gameState === 'create') {
        console.log('Player 2 joined, transitioning from create to countdown');
        setGameState('pre_round_countdown');
      }
      
      // Check for word reveals - both players ready and in playing state
      if (gameSession.player1_ready && gameSession.player2_ready && 
          gameSession.game_status === 'playing' && gameState === 'playing') {
        console.log('Both players ready, revealing words');
        revealWords(gameSession);
      }
    }
  }, [gameSession, gameState]);

  // Celebration effect - play sound and haptic when entering celebration state
  useEffect(() => {
    if (gameState === 'celebrating') {
      playCelebrationSound();
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (hapticError) {
        console.log('Haptic feedback not available:', hapticError);
      }
    }
  }, [gameState]);

  // Countdown effect (same as Base44)
  useEffect(() => {
    if (gameState === 'pre_round_countdown') {
      let count = 3;
      setCountdown(count);

      countdownRef.current = setInterval(() => {
        count--;
        setCountdown(count);
        
        if (count <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          setGameState('playing');
        }
      }, 800);
      
      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
  }, [gameState]);

  const initializeUser = () => {
    const deviceInfo = 'mobile';
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const uniqueId = `user-${deviceInfo}-${timestamp}-${randomId}`;
    setCurrentUserId(uniqueId);
  };

  const initializeAppData = async () => {
    try {
      // Load player profile
      const profile = await loadPlayerProfile();
      if (profile) {
        setPlayerProfile(profile);
      }
      
      // Load settings
      const appSettings = await loadSettings();
      setSettings(appSettings);
      
      // Load premium status
      const premium = await loadPremiumStatus();
      setPremiumStatus(premium);
      
      // Initialize ads
      await initializeAds();
      
      console.log('App data initialized successfully');
    } catch (error) {
      console.error('Error initializing app data:', error);
    }
  };

  const handleUsernameSubmit = () => {
    if (username.trim()) {
      // If there's a join code set (from deep link), go directly to join
      if (joinCode) {
        setGameState('join');
      } else {
        setGameState('mode');
      }
    }
  };

  const handleStartGame = async () => {
    try {
      const sessionCode = 'TELE-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const newSession = {
        session_code: sessionCode,
        player1_id: currentUserId,
        player1_username: username,
        player2_id: null,
        player2_username: null,
        game_status: 'waiting',
        round_number: 1,
        player1_word: '',
        player2_word: '',
        player1_ready: false,
        player2_ready: false,
        word_history: [],
        created_at: new Date().toISOString()
      };

      // Create game in Firebase
      const gameRef = ref(database, `games/${sessionCode}`);
      await set(gameRef, newSession);
      
      setGameSession(newSession);
      
      // Initialize game session tracker
      const tracker = new GameSessionTracker(sessionCode);
      setGameSessionTracker(tracker);
      
      // Reset word submission time
      setWordSubmissionTime(Date.now());
      
      setGameState('create');
      
      // Start listening for player 2
      startGameListener(sessionCode);
      
    } catch (error) {
      console.error('Error creating game:', error);
      Alert.alert('Error', 'Failed to create game. Please try again.');
    }
  };

  const handleJoinGame = async () => {
    console.log('Attempting to join game with code:', joinCode);
    if (!joinCode.trim()) {
      Alert.alert('Error', 'Please enter a game code');
      return;
    }

    try {
      const gameRef = ref(database, `games/${joinCode.toUpperCase()}`);
      console.log('Looking for game at path:', `games/${joinCode.toUpperCase()}`);
      
      // Get current game state
      onValue(gameRef, async (snapshot) => {
        const session = snapshot.val();
        console.log('Game session found:', session);
        
        if (!session) {
          console.log('No game session found for code:', joinCode);
          Alert.alert('Error', 'Game not found!');
          return;
        }

        if (session.player2_id && session.player2_id !== currentUserId) {
          Alert.alert('Error', 'Game is already full!');
          return;
        }

        if (session.player1_id === currentUserId) {
          Alert.alert('Error', 'You cannot join your own game!');
          return;
        }

        // Join as player 2
        const updates = {
          player2_id: currentUserId,
          player2_username: username,
          game_status: 'playing'
        };

        await update(gameRef, updates);
        
        const updatedSession = { ...session, ...updates };
        setGameSession(updatedSession);
        
        // Initialize game session tracker for player 2
        const tracker = new GameSessionTracker(joinCode.toUpperCase());
        setGameSessionTracker(tracker);
        
        // Reset word submission time
        setWordSubmissionTime(Date.now());
        
        setGameState('pre_round_countdown');
        
        startGameListener(joinCode.toUpperCase());
      }, { onlyOnce: true });
      
    } catch (error) {
      console.error('Error joining game:', error);
      Alert.alert('Error', 'Failed to join game. Please try again.');
    }
  };

  const startGameListener = (sessionCode: string) => {
    console.log('Starting game listener for session:', sessionCode);
    const gameRef = ref(database, `games/${sessionCode}`);
    
    gameListenerRef.current = gameRef;
    
    onValue(gameRef, (snapshot) => {
      const session = snapshot.val();
      console.log('Game listener received update:', session);
      if (session) {
        setGameSession(session);
        
        // Game state transitions are now handled in useEffect
        
        // Word reveals are now handled in useEffect
        
        // Check for game completion
        const isGameWon = session.word_history?.some((h: any) => 
          h.player1_word?.toLowerCase().trim() === h.player2_word?.toLowerCase().trim()
        );
        
        if (isGameWon && gameState !== 'celebrating') {
          setGameState('celebrating');
        }
        
        // Handle rematch requests
        if (session.rematch_requested && session.rematch_initiator_username) {
          setRematchRequested(true);
          setRematchInitiator(session.rematch_initiator_username);
        } else if (!session.rematch_requested) {
          setRematchRequested(false);
          setRematchInitiator('');
        }
      }
    });
  };

  const revealWords = async (session: any) => {
    console.log('Revealing words for session:', session);
    const p1Word = session.player1_word?.toLowerCase().trim();
    const p2Word = session.player2_word?.toLowerCase().trim();
    const wordsMatch = p1Word === p2Word;
    
    console.log('Player 1 word:', p1Word, 'Player 2 word:', p2Word, 'Match:', wordsMatch);

    const newHistoryEntry = {
      round: session.round_number,
      player1_word: session.player1_word,
      player2_word: session.player2_word,
      words_match: wordsMatch
    };
    
    const newHistory = [...(session.word_history || []), newHistoryEntry];
    
    try {
      const gameRef = ref(database, `games/${session.session_code}`);
      console.log('Updating game with new history:', newHistory);
      
      if (wordsMatch) {
        console.log('Words match! Setting game to completed');
        await update(gameRef, {
          word_history: newHistory,
          game_status: 'completed'
        });
        setGameState('celebrating');
      } else {
        console.log('Words do not match, preparing for next round');
        await update(gameRef, {
          word_history: newHistory,
          round_number: session.round_number + 1,
          player1_word: '',
          player2_word: '',
          player1_ready: false,
          player2_ready: false,
          game_status: 'playing'
        });
      }
    } catch (error) {
      console.error('Error updating game after reveal:', error);
    }
  };

  const handleWordSubmit = async () => {
    if (!currentWord.trim() || !gameSession) return;

    try {
      // Calculate response time
      const responseTime = Date.now() - wordSubmissionTime;
      
      // Validate submission
      const validation = validateSubmission(currentWord.trim(), responseTime);
      if (!validation.isValid) {
        Alert.alert('Invalid Submission', validation.errors.join('\n'));
        return;
      }

      // Play chime sound for word submission
      playChimeSound('submit');
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (hapticError) {
        console.log('Haptic feedback not available:', hapticError);
      }
      
      const isPlayer1 = gameSession.player1_id === currentUserId;
      const gameRef = ref(database, `games/${gameSession.session_code}`);
      
      // Record submission in game session tracker
      if (gameSessionTracker) {
        gameSessionTracker.recordSubmission(currentUserId, currentWord.trim(), Date.now());
      }
      
      const updates = isPlayer1 
        ? { player1_word: currentWord.trim(), player1_ready: true }
        : { player2_word: currentWord.trim(), player2_ready: true };

      await update(gameRef, updates);
      setCurrentWord('');
      
    } catch (error) {
      console.error('Error submitting word:', error);
      Alert.alert('Error', 'Failed to submit word. Please try again.');
    }
  };

  const handleExitGame = () => {
    if (gameListenerRef.current) {
      off(gameListenerRef.current);
    }
    setGameSession(null);
    setRematchRequested(false);
    setRematchInitiator('');
    setGameState('title');
  };

  // Rematch functions
  const handleRematchRequest = async () => {
    if (!gameSession) return;
    
    try {
      const gameRef = ref(database, `games/${gameSession.session_code}`);
      await update(gameRef, {
        rematch_requested: true,
        rematch_initiator_id: currentUserId,
        rematch_initiator_username: username,
      });
      setRematchRequested(true);
      setRematchInitiator(username);
    } catch (error) {
      console.error('Failed to request rematch:', error);
    }
  };

  const handleRematchConfirm = async () => {
    if (!gameSession) return;
    
    try {
      const gameRef = ref(database, `games/${gameSession.session_code}`);
      await update(gameRef, {
        round_number: 1,
        player1_word: '',
        player2_word: '',
        player1_ready: false,
        player2_ready: false,
        game_status: 'playing',
        word_history: [],
        rematch_requested: false,
        rematch_initiator_id: null,
        rematch_initiator_username: null,
      });
      setRematchRequested(false);
      setRematchInitiator('');
      setGameState('playing');
    } catch (error) {
      console.error('Failed to confirm rematch:', error);
    }
  };

  const handleRematchDecline = async () => {
    if (!gameSession) return;
    
    try {
      const gameRef = ref(database, `games/${gameSession.session_code}`);
      await update(gameRef, {
        rematch_requested: false,
        rematch_initiator_id: null,
        rematch_initiator_username: null,
      });
      setRematchRequested(false);
      setRematchInitiator('');
    } catch (error) {
      console.error('Failed to decline rematch:', error);
    }
  };

  // Game statistics functions
  const calculateGameStats = () => {
    if (!gameSession?.word_history) return null;
    
    const totalRounds = gameSession.word_history.length;
    const matches = gameSession.word_history.filter(round => round.words_match).length;
    const matchRate = totalRounds > 0 ? (matches / totalRounds * 100).toFixed(1) : 0;
    
    return {
      totalRounds,
      matches,
      matchRate,
      averageWordsPerRound: totalRounds > 0 ? (totalRounds * 2).toFixed(0) : 0,
    };
  };

  // Sharing functionality
  const shareGameLink = async () => {
    if (!gameSession?.session_code) return;

    // For development testing, use custom scheme instead of Universal Links
    // TODO: Change back to Universal Links when building for production
    const customSchemeLink = `telepathy://join/${gameSession.session_code}`;
    const universalLink = `https://telepathy-game-zeta.vercel.app/join/${gameSession.session_code}`;
    
    const shareMessage = `🎮 Join my Telepathy game!\n\nClick this link to join: ${customSchemeLink}\n\nOr visit: ${universalLink}\n\nOr enter this code in the app: ${gameSession.session_code}`;

    try {
      await Share.share({
        message: shareMessage,
        url: customSchemeLink, // Use custom scheme for development testing
        title: 'Join my Telepathy game!'
      });
    } catch (error) {
      console.error('Error sharing game link:', error);
      Alert.alert('Error', 'Failed to share game link');
    }
  };

  const copyGameCode = async () => {
    if (!gameSession?.session_code) return;

    try {
      // For React Native, we'll use the Share API to copy to clipboard
      // Note: For better clipboard support, you might want to install @react-native-clipboard/clipboard
      await Share.share({
        message: gameSession.session_code,
        title: 'Game Code'
      });
      Alert.alert('Success', 'Game code copied! Share it with your friend.');
    } catch (error) {
      console.error('Error copying game code:', error);
      Alert.alert('Error', 'Failed to copy game code');
    }
  };

  // Tutorial functions
  const startTutorial = () => {
    setShowTutorial(true);
    setTutorialStep(0);
  };

  const nextTutorialStep = () => {
    if (tutorialStep < 3) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setShowTutorial(false);
      setGameState('username');
    }
  };

  const previousTutorialStep = () => {
    if (tutorialStep > 0) {
      setTutorialStep(tutorialStep - 1);
    } else {
      setShowTutorial(false);
      setGameState('title');
    }
  };

  // Audio functions - temporarily disabled until sound files are added
  const playChimeSound = async (type = 'submit') => {
    // Audio temporarily disabled - will work when sound files are added
    console.log('Chime sound would play here');
  };

  const playCelebrationSound = async () => {
    // Audio temporarily disabled - will work when sound files are added
    console.log('Celebration sound would play here');
  };

  const playButtonSound = async () => {
    // Audio temporarily disabled - will work when sound files are added
    console.log('Button sound would play here');
  };

  // Render functions
  const renderTitleScreen = () => (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f172a', '#1e3a8a', '#3730a3']} // slate-900 to blue-800 to indigo-800
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.centerContent}>
        <Animated.Text 
          style={[
            styles.title,
            {
              transform: [{ scale: titleScale }],
              opacity: titleOpacity,
              fontSize: getResponsiveFontSize(),
              letterSpacing: getResponsiveFontSize() * 0.1,
              width: screenWidth - 40,
              textAlign: 'center',
            }
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.8}
        >
          TELEPATHY
        </Animated.Text>
        <Animated.Text 
          style={[
            styles.subtitle,
            {
              opacity: titleOpacity,
              transform: [{ scale: titleScale }],
              fontSize: getResponsiveSubtitleSize(),
            }
          ]}
        >
          Are you ready to begin the mind connection?
        </Animated.Text>
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                playButtonSound();
                setGameState('username');
              } catch (error) {
                console.log('Error in button press:', error);
                setGameState('username');
              }
            }}
          >
            <Text style={styles.buttonText}>Start</Text>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                playButtonSound();
                startTutorial();
              } catch (error) {
                console.log('Error in tutorial button press:', error);
                startTutorial();
              }
            }}
          >
            <Text style={styles.buttonText}>How to Play</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );

  const renderUsernameScreen = () => (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <Text style={styles.usernameTitle}>Enter Your Name</Text>
        {joinCode && (
          <Text style={styles.subtitle}>Joining game: {joinCode}</Text>
        )}
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Your username"
          placeholderTextColor="#666"
        />
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleUsernameSubmit}
        >
          <Text style={styles.buttonText}>
            {joinCode ? 'Join Game' : 'Continue'}
          </Text>
        </TouchableOpacity>
        
        {/* Back Button - Centered under Continue button */}
        <TouchableOpacity 
          style={styles.backButtonCentered} 
          onPress={() => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              playButtonSound();
              setGameState('title');
            } catch (error) {
              console.log('Error in back button press:', error);
              setGameState('title');
            }
          }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderModeSelection = () => (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <Text style={styles.usernameTitle}>Hello, {username}!</Text>
        <Text style={styles.subtitle}>Choose Game Mode</Text>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleStartGame}
        >
          <Text style={styles.buttonText}>Create New Game</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={() => setGameState('join')}
        >
          <Text style={styles.buttonText}>Join Game</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCreateGame = () => {
    const qrSize = Math.min(160, Math.max(120, 200 * 0.8)); // 20% smaller than original
    
    return (
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.createGameContainer}>
            <Text style={[styles.title, styles.smallerTitle]}>Game Created!</Text>
            <Text style={styles.gameCode}>Code: {gameSession?.session_code}</Text>
            
            <Text style={[styles.instruction, { marginTop: 15 }]}>
              Share this code with a friend so they can join the game.
            </Text>
            
            <Text style={styles.waitingText}>Waiting to begin...</Text>
            
            {/* Sharing buttons */}
            <View style={styles.sharingContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.shareButton]} 
                onPress={copyGameCode}
              >
                <Text style={styles.buttonText}>📋 Copy Code</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} 
                onPress={shareGameLink}
              >
                <Text style={styles.buttonText}>🔗 Share Link</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.button, styles.exitButton]} 
              onPress={handleExitGame}
            >
              <Text style={styles.buttonText}>Cancel Game</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderJoinGame = () => (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <Text style={styles.title}>Join Game</Text>
        <Text style={styles.subtitle}>Enter the game code</Text>
        
        <TextInput
          style={styles.input}
          value={joinCode}
          onChangeText={setJoinCode}
          placeholder="Enter game code (TELE-XXXXXX)"
          placeholderTextColor="#666"
          autoCapitalize="characters"
        />
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleJoinGame}
        >
          <Text style={styles.buttonText}>Join Game</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={() => setGameState('mode')}
        >
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCountdown = () => (
    <View style={styles.countdownContainer}>
      <Text style={styles.countdownText}>
        {countdown > 0 ? countdown : 'GO!'}
      </Text>
    </View>
  );

  const renderGamePlay = () => {
    const isPlayer1 = gameSession?.player1_id === currentUserId;
    const myReady = isPlayer1 ? gameSession?.player1_ready : gameSession?.player2_ready;
    const otherReady = isPlayer1 ? gameSession?.player2_ready : gameSession?.player1_ready;
    const otherUsername = isPlayer1 ? gameSession?.player2_username : gameSession?.player1_username;
  
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.gameCode}>Game: {gameSession?.session_code}</Text>
          <Text style={styles.roundText}>Round {gameSession?.round_number || 1}</Text>
          <Text style={styles.vsText}>{username} vs {otherUsername}</Text>
        </View>
  
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.gamePlayContent}>
            {/* Word History - Moved to top */}
            {gameSession?.word_history && gameSession.word_history.length > 0 && (
              <View style={styles.historyContainer}>
                <Text style={styles.historyTitle}>Previous Rounds:</Text>
                <ScrollView 
                  style={styles.historyScroll}
                  showsVerticalScrollIndicator={false}
                  ref={(ref) => {
                    // Auto-scroll to bottom when new rounds are added
                    if (ref && gameSession.word_history.length > 0) {
                      setTimeout(() => {
                        ref.scrollToEnd({ animated: true });
                      }, 100);
                    }
                  }}
                >
                  {gameSession.word_history.map((round, index) => (
                    <View key={index} style={styles.historyRound}>
                      <Text style={styles.historyText}>
                        Round {round.round}: "{round.player1_word}" vs "{round.player2_word}"
                      </Text>
                      {round.words_match ? (
                        <Text style={styles.matchText}>✓ MATCH!</Text>
                      ) : (
                        <Text style={styles.noMatchText}>✗ No Match</Text>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
            
            {!myReady ? (
              <>
                <Text style={styles.instruction}>
                  Think and enter a word{'\n'}
                </Text>
  
                <TextInput
                  style={styles.wordInput}
                  value={currentWord}
                  onChangeText={(text) => {
                    setCurrentWord(text);
                    // Start timing when user starts typing
                    if (!wordSubmissionTime) {
                      setWordSubmissionTime(Date.now());
                    }
                  }}
                  placeholder="Enter your word..."
                  placeholderTextColor="#666"
                  onSubmitEditing={handleWordSubmit}
                  returnKeyType="done"
                  blurOnSubmit={false}
                />
                
                {/* Keyboard dismiss button */}
                <TouchableOpacity 
                  style={styles.keyboardDismissButton} 
                  onPress={() => {
                    Keyboard.dismiss();
                  }}
                >
                  <Text style={styles.keyboardDismissText}>⌨️ Hide Keyboard</Text>
                </TouchableOpacity>
  
                <TouchableOpacity 
                  style={styles.submitButton} 
                  onPress={handleWordSubmit}
                >
                  <Text style={styles.buttonText}>Submit Word</Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.waitingContainer}>
                <Text style={styles.waitingText}>Word submitted!</Text>
                <Text style={styles.waitingSubtext}>
                  {otherReady ? 'Revealing words...' : 'Waiting for your partner...'}
                </Text>
              </View>
            )}
  
            <TouchableOpacity 
              style={[styles.button, styles.exitButton]} 
              onPress={handleExitGame}
            >
              <Text style={styles.buttonText}>Exit Game</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderCelebration = () => {
    const lastRound = gameSession?.word_history?.[gameSession.word_history.length - 1];
    
    return (
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.celebrationContainer}>
            <Animated.Text 
              style={[
                styles.title,
                {
                  fontSize: getResponsiveFontSize(),
                  letterSpacing: getResponsiveFontSize() * 0.1,
                  width: screenWidth - 40,
                  textAlign: 'center',
                }
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.8}
            >
              TELEPATHY!
            </Animated.Text>
            <Text style={styles.celebrationText}>
              You both thought: "{lastRound?.player1_word}"
            </Text>
            <Text style={styles.celebrationSubtext}>
              Completed in {gameSession?.word_history?.length} rounds!
            </Text>
            
            {/* Game Statistics */}
            {calculateGameStats() && (
              <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>Game Statistics</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{calculateGameStats()?.totalRounds}</Text>
                    <Text style={styles.statLabel}>Rounds</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{calculateGameStats()?.matches}</Text>
                    <Text style={styles.statLabel}>Matches</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{calculateGameStats()?.matchRate}%</Text>
                    <Text style={styles.statLabel}>Success Rate</Text>
                  </View>
                </View>
                
                {/* Advanced Scoring Breakdown */}
                {gameSessionTracker && (
                  <View style={styles.advancedStatsContainer}>
                    <Text style={styles.advancedStatsTitle}>Advanced Scoring</Text>
                    {(gameSessionTracker as any).wordHistory?.map((round: any, index: number) => (
                      <View key={index} style={styles.roundScoreContainer}>
                        <Text style={styles.roundScoreTitle}>Round {round.round}</Text>
                        <View style={styles.scoreBreakdown}>
                          <Text style={styles.scoreDetail}>
                            Match Quality: {round.matchQuality.type} ({round.matchQuality.score} pts)
                          </Text>
                          <Text style={styles.scoreDetail}>
                            Timing: {round.simultaneityScore.type} ({round.simultaneityScore.score} pts)
                          </Text>
                          <Text style={styles.scoreDetail}>
                            Word Rarity: {round.wordRarity} pts
                          </Text>
                          <Text style={styles.scoreDetail}>
                            <Text style={styles.telepathyRating}>Telepathy Rating: {round.telepathyRating}</Text>
                          </Text>
                        </View>
                      </View>
                    ))}
                    
                    {/* Overall Session Rating */}
                    {(gameSessionTracker as any).wordHistory?.length > 0 && (
                      <View style={styles.overallRatingContainer}>
                        <Text style={styles.overallRatingTitle}>Overall Session Rating</Text>
                        <Text style={styles.overallRatingValue}>
                          {Math.round((gameSessionTracker as any).wordHistory.reduce((sum: number, r: any) => sum + r.telepathyRating, 0) / (gameSessionTracker as any).wordHistory.length)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
            
            {rematchRequested && (
              <View style={styles.rematchNotification}>
                <Text style={styles.rematchText}>
                  {rematchInitiator === username ? 
                    'Rematch requested! Waiting for your friend...' : 
                    `${rematchInitiator} wants a rematch!`
                  }
                </Text>
                {rematchInitiator !== username && (
                  <View style={styles.rematchActions}>
                    <TouchableOpacity 
                      style={[styles.button, styles.confirmButton]} 
                      onPress={handleRematchConfirm}
                    >
                      <Text style={styles.buttonText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.button, styles.declineButton]} 
                      onPress={handleRematchDecline}
                    >
                      <Text style={styles.buttonText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
            

            
            {/* Main action buttons */}
            <View style={styles.celebrationButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.rematchButton]} 
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    playButtonSound();
                    handleRematchRequest();
                  } catch (error) {
                    console.log('Error in rematch button press:', error);
                    handleRematchRequest();
                  }
                }}
              >
                <Text style={styles.buttonText}>Rematch</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.newGameButton]} 
                onPress={() => {
                  try {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    playButtonSound();
                    setGameState('mode');
                  } catch (error) {
                    console.log('Error in home button press:', error);
                    setGameState('mode');
                  }
                }}
              >
                <Text style={styles.buttonText}>Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderTutorial = () => {
    const tutorialSteps = [
      {
        title: "Connect Your Minds",
        description: "Play with a friend to see if you can think alike. It's simple, fun, and a little bit challenging!",
        icon: "🧠"
      },
      {
        title: "Match Your Word",
        description: "In each round, you and your friend will both enter a word. The goal is for your words to be IDENTICAL. Try to read their mind!",
        icon: "🎯"
      },
      {
        title: "Think Alike",
        description: "You both think of a word at the same time. If you choose the same word, you win! If not, try again in the next round.",
        icon: "💭"
      },
      {
        title: "Ready to Play?",
        description: "Create a game, share the code with your friend, and start reading each other's minds!",
        icon: "🚀"
      }
    ];

    const currentStep = tutorialSteps[tutorialStep];

    return (
      <View style={styles.container}>
        <View style={styles.gradientBackground} />
        <View style={styles.centerContent}>
          <Text style={styles.tutorialIcon}>{currentStep.icon}</Text>
          <Text style={styles.tutorialTitle}>{currentStep.title}</Text>
          <Text style={styles.tutorialDescription}>{currentStep.description}</Text>
          
          <View style={styles.tutorialButtons}>
            <TouchableOpacity 
              style={[styles.tutorialButton, styles.secondaryButton]} 
              onPress={previousTutorialStep}
            >
              <Text style={styles.buttonText}>
                {tutorialStep === 0 ? 'Back' : 'Back'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.tutorialButton} 
              onPress={nextTutorialStep}
            >
              <Text style={styles.buttonText}>
                {tutorialStep === 3 ? 'Start' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // Main render function
  const renderCurrentScreen = () => {
    if (showTutorial) {
      return renderTutorial();
    }

    switch (gameState) {
      case 'title':
        return renderTitleScreen();
      case 'username':
        return renderUsernameScreen();
      case 'mode':
        return renderModeSelection();
      case 'create':
        return renderCreateGame();
      case 'join':
        return renderJoinGame();
      case 'pre_round_countdown':
        return renderCountdown();
      case 'playing':
        return renderGamePlay();
      case 'celebrating':
        return renderCelebration();
      default:
        return renderTitleScreen();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderCurrentScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a', // slate-900 equivalent
  },
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // slate-900 equivalent
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 20, // Add horizontal padding
    width: '100%', // Ensure full width
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f172a', // slate-900
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontWeight: 'bold', // bold font weight like username title
    color: '#60a5fa', // blue-400 color for gradient effect
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(59, 130, 246, 0.6)', // enhanced blue glow
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 25,
    // Dynamic sizing properties
    flexShrink: 1,
    flexWrap: 'nowrap',
  },
  smallerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  usernameTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#60a5fa', // blue-400 color like main title
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(59, 130, 246, 0.4)', // subtle glow
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  subtitle: {
    fontSize: 24, // Keep original size
    color: '#bfdbfe', // blue-200 equivalent
    textAlign: 'center',
    marginBottom: 40,
    opacity: 0.8,
  },
  gameCode: {
    fontSize: 18,
    color: '#888',
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  roundText: {
    fontSize: 36,
    color: '#fff',
    fontWeight: 'bold',
  },
  vsText: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 5,
  },
  instruction: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    paddingHorizontal: 10,
    maxWidth: 300,
  },
  input: {
    width: '100%',
    maxWidth: 300,
    height: 50,
    backgroundColor: '#2a2a4a',
    color: '#fff',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#3a3a6a',
  },
  wordInput: {
    width: '100%',
    maxWidth: 300,
    height: 60,
    backgroundColor: '#2a2a4a',
    color: '#fff',
    borderRadius: 15,
    paddingHorizontal: 20,
    fontSize: 20,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: '#4a4a8a',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#6c5ce7',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 10,
    minWidth: 140,
    maxWidth: 280,
    shadowColor: '#6c5ce7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  secondaryButton: {
    backgroundColor: '#a29bfe',
  },
  submitButton: {
    backgroundColor: '#00b894',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 25,
    marginBottom: 20,
  },
  exitButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 20,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  backButtonCentered: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 0,
    alignSelf: 'center',
  },
  backButtonText: {
    color: '#bfdbfe',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  qrContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    marginVertical: 15,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  waitingText: {
    fontSize: 18,
    color: '#CCC',
    marginVertical: 15,
    textAlign: 'center',
  },
  waitingContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  waitingSubtext: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 10,
    textAlign: 'center',
  },
  countdownContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  countdownText: {
    fontSize: 100,
    fontWeight: 'bold',
    color: '#fff',
  },
  historyContainer: {
    maxHeight: 200,
    width: '100%',
    marginVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  historyTitle: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 10,
    textAlign: 'center',
  },
  historyRound: {
    backgroundColor: '#2a2a4a',
    padding: 10,
    borderRadius: 10,
    marginBottom: 5,
  },
  historyText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  matchText: {
    color: '#00b894',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    fontWeight: 'bold',
  },
  noMatchText: {
    color: '#e17055',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    fontWeight: 'bold',
  },
  historyScroll: {
    maxHeight: 120,
  },
  celebrationTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffd700',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: '#ffd700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  celebrationText: {
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  celebrationSubtext: {
    fontSize: 18,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 40,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: '100%',
  },
  createGameContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  gamePlayContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  sharingContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 15,
  },
  shareButton: {
    backgroundColor: '#6c5ce7',
    marginBottom: 8,
    marginTop: 20,
  },
  copyButton: {
    backgroundColor: '#a29bfe',
    marginBottom: 8,
  },
  tutorialIcon: {
    fontSize: 80,
    textAlign: 'center',
    marginBottom: 20,
  },
  tutorialTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  tutorialDescription: {
    fontSize: 16,
    color: '#bfdbfe',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
    paddingHorizontal: 20,
    maxWidth: 300, // Limit width for better readability
  },
  tutorialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 320, // Responsive max width
    gap: 15, // Add gap between buttons
  },
  tutorialButton: {
    backgroundColor: '#6c5ce7',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 10,
    minWidth: 120,
    maxWidth: 140,
    shadowColor: '#6c5ce7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  celebrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  celebrationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 15,
  },
  rematchButton: {
    backgroundColor: '#00b894',
    flex: 0,
    minWidth: 120,
    maxWidth: 140,
  },
  newGameButton: {
    backgroundColor: '#6c5ce7',
    flex: 0,
    minWidth: 120,
    maxWidth: 140,
  },
  rematchNotification: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  rematchText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
  },
  rematchActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
  },
  confirmButton: {
    backgroundColor: '#00b894',
    flex: 0,
    minWidth: 100,
    maxWidth: 120,
  },
  declineButton: {
    backgroundColor: '#e17055',
    flex: 0,
    minWidth: 100,
    maxWidth: 120,
  },
  statsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#ffd700',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#bfdbfe',
    fontSize: 12,
    marginTop: 5,
  },
  maskedView: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientFill: {
    flex: 1,
  },
  keyboardDismissButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  keyboardDismissText: {
    color: '#bfdbfe',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Advanced scoring styles
  advancedStatsContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  advancedStatsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  roundScoreContainer: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  roundScoreTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  scoreBreakdown: {
    marginLeft: 10,
  },
  scoreDetail: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
  },
  telepathyRating: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  overallRatingContainer: {
    marginTop: 15,
    padding: 15,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  overallRatingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 8,
  },
  overallRatingValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
  },
});