/*
 * HomeScreen.tsx — The main landing screen of the Legal AI Assistant.
 *
 * PURPOSE: This is the first screen users see when they open the app.
 * It provides a branded hero section with the app name and tagline,
 * followed by large navigation tiles for the three core features:
 * Chat, Documents, and Settings.
 *
 * DESIGN DECISIONS:
 * - Large touch targets (tiles) for easy one-handed use on mobile.
 * - Emoji icons instead of an icon library — keeps the bundle small for MVP.
 * - Animated entrance via Animated API — makes the app feel alive on launch.
 * - SafeAreaView ensures content doesn't overlap with notches or status bars.
 *
 * NAVIGATION: Uses React Navigation's useNavigation hook to move between screens.
 * The RootStackParamList type ensures we can only navigate to valid routes.
 */

/* Import React and hooks — useRef for storing the animated value, useEffect for triggering animation on mount, useState for status state */
import React, { useRef, useEffect, useState } from 'react';

/* Import all the React Native components we need for this screen */
import {
  View, // Basic layout container — the building block of all RN UIs
  Text, // Renders text — the only way to display text in RN
  StyleSheet, // Creates optimized native style objects
  TouchableOpacity, // A touchable wrapper that reduces opacity on press — gives visual feedback
  Animated, // Provides animation primitives (timing, spring, etc.)
  ScrollView // Scrollable container — in case content overflows on small screens
} from 'react-native';

/* SafeAreaView adds padding for device notches, status bars, and home indicators */
import { SafeAreaView } from 'react-native-safe-area-context';

/* useNavigation gives us access to the navigation object to move between screens */
import { useNavigation } from '@react-navigation/native';

/* NativeStackNavigationProp types the navigation object so we get autocomplete for route names */


/* Import the route type definition from our navigator so TypeScript knows valid routes */


/* Import theme tokens for consistent visual design */
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

/* Import modelManager for reactive AI model status */
import modelManager from '../services/modelManager';

/*
 * Type alias for the navigation prop on this screen.
 * NativeStackNavigationProp<RootStackParamList, 'Home'> means:
 * "This is the navigation prop for the 'Home' route in our stack."
 * It gives us type-safe navigate() calls — e.g., navigation.navigate('Chat') is valid,
 * but navigation.navigate('NonExistent') would be a compile error.
 */


/*
 * TILES — Configuration array for the three navigation tiles on the home screen.
 *
 * Each tile has:
 * - id: unique key for React's list rendering (used in keyExtractor/key prop)
 * - title: the label displayed on the tile
 * - icon: emoji used as a visual icon (avoids icon library dependency)
 * - route: the navigation route name — must be a key of RootStackParamList
 * - description: short helper text explaining what the tile does
 *
 * Using a data array + map() is cleaner than repeating JSX for each tile.
 * If we add more tiles later, we only need to add an entry here.
 */
const TILES = [
{
  id: 'cases',
  title: 'Case Files',
  icon: '💼',
  route: 'Cases',
  description: 'Manage case folders & timelines'
},
{
  id: 'chat',
  title: 'Chat',
  icon: '💬',
  route: 'Chat', // "as const" narrows the type from string to literal 'Chat'
  description: 'Ask legal questions to the AI'
},
{
  id: 'documents',
  title: 'Documents',
  icon: '📄',
  route: 'Documents', // Literal type ensures type-safe navigation
  description: 'Upload and manage legal PDFs'
},
{
  id: 'settings',
  title: 'Settings',
  icon: '⚙️',
  route: 'Settings', // Literal type for the Settings route
  description: 'Model info and storage'
}];


/*
 * HomeScreen — The root landing screen component.
 *
 * This is a function component (not a class) — the modern React pattern.
 * It renders:
 * 1. A hero section with the app brand
 * 2. Three navigation tiles that link to Chat, Documents, and Settings
 * 3. A subtle footer with version info
 */
const HomeScreen = () => {
  /*
   * useNavigation() — Hook that returns the navigation object.
   * We type it with NavigationProp so TypeScript knows which routes exist.
   * This navigation object has methods like navigate(), goBack(), push(), etc.
   */
  const navigation = useNavigation();

  /* Local state to track the model status reactively on Home screen */
  const [modelStatus, setModelStatus] = useState(modelManager.getStatus());

  /* Check model status initially and subscribe to updates */
  useEffect(() => {
    modelManager.checkModelExists();
    const unsubscribe = modelManager.addStatusListener((status) => {
      setModelStatus(status);
    });
    return unsubscribe;
  }, []);

  /*
   * useRef(new Animated.Value(0)) — Creates a persistent animated value.
   *
   * useRef ensures the Animated.Value is created ONCE and persists across re-renders.
   * If we used useState or a plain variable, it would reset on every render.
   * The value starts at 0 (invisible/off-screen) and animates to 1 (fully visible).
   */
  const fadeAnim = useRef(new Animated.Value(0)).current; // .current extracts the value from the ref

  /*
   * useRef for slide animation — tiles slide up from 30px below their final position.
   * Starting at 30 means the content is shifted down; animating to 0 moves it to place.
   */
  const slideAnim = useRef(new Animated.Value(30)).current;

  /*
   * useEffect with empty dependency array [] — runs ONCE after the first render.
   * This is the equivalent of componentDidMount in class components.
   *
   * We use Animated.parallel() to run fade and slide animations simultaneously.
   * Both animations take 800ms and use the "out" easing (starts fast, slows down).
   * useNativeDriver: true offloads the animation to the native thread — smoother 60fps.
   */
  useEffect(() => {
    Animated.parallel([
    // Fade: opacity goes from 0 → 1 over 800ms
    Animated.timing(fadeAnim, {
      toValue: 1, // Final opacity — fully visible
      duration: 800, // Animation length in milliseconds
      useNativeDriver: true // Run on native thread for smooth performance
    }),
    // Slide: translateY goes from 30 → 0 over 800ms (slides up into place)
    Animated.timing(slideAnim, {
      toValue: 0, // Final position — no vertical offset
      duration: 800, // Same duration so both finish together
      useNativeDriver: true // Native thread for 60fps smoothness
    })]
    ).start(); // .start() kicks off the animation — without it, nothing happens
  }, [fadeAnim, slideAnim]); // Run on mount, dependencies are stable refs

  return (
    /*
     * SafeAreaView — Wraps the entire screen to avoid notches and system UI.
     * edges={['top']} means only add safe area padding at the top (for status bar).
     * We don't need bottom padding here because ScrollView handles that.
     */
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/*
        * ScrollView — Makes the content scrollable if it overflows.
        * contentContainerStyle adds padding inside the scrollable area.
        * showsVerticalScrollIndicator={false} hides the scrollbar for cleaner look.
        */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false} // Hide scrollbar — cleaner aesthetic
      >
        {/*
          * Animated.View — A View that can be animated.
          * We bind its opacity and translateY to our animated values.
          * As fadeAnim goes 0→1, the view fades in.
          * As slideAnim goes 30→0, the view slides up.
          */}
        <Animated.View
          style={[
          styles.content,
          {
            opacity: fadeAnim, // Bind opacity to the fade animation value
            transform: [{ translateY: slideAnim }] // Bind vertical position to slide animation
          }]
          }>
          
          {/* ─── HERO SECTION ─── */}
          {/* The branded top area with app name, icon, and tagline */}
          <View style={styles.heroSection}>
            {/* Large emoji as the app icon — scales-of-justice represents legal domain */}
            <Text style={styles.heroIcon}>⚖️</Text>

            {/* App name — large, bold, white text */}
            <Text style={styles.heroTitle}>LegalAI</Text>

            {/* Tagline — smaller, muted text explaining the app's purpose */}
            <Text style={styles.heroSubtitle}>
              Your offline legal assistant
            </Text>

            {/* Decorative gold divider line under the hero text */}
            <View style={styles.heroDivider} />
          </View>

          {/* ─── NAVIGATION TILES ─── */}
          {/* Section heading for the tile grid */}
          <Text style={styles.sectionTitle}>What would you like to do?</Text>

          {/*
            * Map over the TILES array to render each navigation card.
            * Using .map() keeps the JSX DRY — we define tile data once in the array.
            * Each tile gets a unique key prop (required by React for list reconciliation).
            */}
          {TILES.map((tile) => (
          /*
           * TouchableOpacity — The entire tile is tappable.
           * onPress navigates to the route defined in the tile's config.
           * activeOpacity={0.8} means the tile dims to 80% opacity on press.
           */
          <TouchableOpacity
            key={tile.id} // Unique key for React's diffing algorithm
            style={styles.tile} // Card styling — background, padding, radius
            activeOpacity={0.8} // Slight dim on press for tactile feedback
            onPress={() => navigation.navigate(tile.route)} // Navigate to the tile's route
          >
              {/* Left section: emoji icon + text */}
              <View style={styles.tileContent}>
                {/* Large emoji icon */}
                <Text style={styles.tileIcon}>{tile.icon}</Text>

                {/* Text container: title + description stacked vertically */}
                <View style={styles.tileTextContainer}>
                  {/* Tile title — white, semi-bold */}
                  <Text style={styles.tileTitle}>{tile.title}</Text>
                  {/* Tile description — smaller, muted gray */}
                  <Text style={styles.tileDescription}>{tile.description}</Text>
                </View>
              </View>

              {/* Right-side chevron arrow indicating this tile is tappable/navigable */}
              <Text style={styles.tileArrow}>›</Text>
            </TouchableOpacity>)
          )}

          {/* ─── FOOTER ─── */}
          {/* Version info and offline badges at the bottom of the screen */}
          <View style={styles.footer}>
            {/* Offline indicator — lets users know the app works without internet */}
            <View style={styles.offlineBadge}>
              {/* Green dot — visual indicator that offline mode is active */}
              <View style={styles.offlineDot} />
              <Text style={styles.offlineText}>Fully Offline</Text>
            </View>

            {/* AI Status Badge */}
            {(() => {
              /* Get color and text based on active model status state */
              const getAiBadgeDetails = () => {
                switch (modelStatus) {
                  case 'ready':
                    return { text: 'AI Ready ✓', color: COLORS.success };
                  case 'loading':
                    return { text: 'AI Loading...', color: COLORS.primary };
                  case 'downloading':
                    return { text: 'Downloading AI...', color: COLORS.primary };
                  case 'idle':
                    return { text: 'AI Idle', color: COLORS.textSecondary };
                  case 'error':
                    return { text: 'AI Error', color: COLORS.error };
                  case 'not_downloaded':
                  default:
                    return { text: 'AI Not Loaded', color: COLORS.warning };
                }
              };
              const aiBadge = getAiBadgeDetails();
              return (
                <View style={[styles.offlineBadge, { marginLeft: SPACING.sm }]}>
                  <View style={[styles.offlineDot, { backgroundColor: aiBadge.color }]} />
                  <Text style={[styles.offlineText, { color: aiBadge.color }]}>{aiBadge.text}</Text>
                </View>);

            })()}

            {/* Version number — helps with bug reports and support */}
            <Text style={styles.versionText}>v0.1.0 MVP</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>);

};

/*
 * StyleSheet.create() — Creates an optimized stylesheet.
 *
 * React Native converts these JS objects into native style references at startup.
 * This is more efficient than inline styles because:
 * 1. The style objects are validated once at creation time
 * 2. Only an integer ID is passed over the JS-native bridge (not the full object)
 * 3. It prevents creating new objects on every render
 */
const styles = StyleSheet.create({
  /* SafeAreaView fills the entire screen with the dark background */
  safeArea: {
    flex: 1, // Take all available vertical space
    backgroundColor: COLORS.background // Deep navy background
  },

  /* ScrollView's inner content container — adds padding around all content */
  scrollContent: {
    flexGrow: 1, // Allows content to grow and fill available space
    paddingBottom: SPACING.xl // Extra bottom padding so content doesn't touch screen edge
  },

  /* Main content wrapper — adds horizontal padding to all children */
  content: {
    flex: 1, // Take all available space
    paddingHorizontal: SPACING.lg // 24px left/right padding
  },

  /* ─── Hero Section Styles ─── */

  /* Hero container — centered content with large top padding */
  heroSection: {
    alignItems: 'center', // Center children horizontally
    paddingTop: SPACING.xxl, // 48px from the top — gives the hero breathing room
    paddingBottom: SPACING.xl // 32px below — space before the tiles section
  },

  /* Large emoji icon at the top of the hero */
  heroIcon: {
    fontSize: 64, // Very large — serves as the "app icon"
    marginBottom: SPACING.md // 16px gap between icon and title
  },

  /* App name — largest text on the screen */
  heroTitle: {
    fontSize: 36, // Larger than FONTS.title for extra impact
    fontWeight: FONTS.weightBold, // Bold weight for brand emphasis
    color: COLORS.textPrimary, // White text
    letterSpacing: 1 // Slight letter spacing for elegance
  },

  /* Tagline below the app name */
  heroSubtitle: {
    fontSize: FONTS.body, // 16px — readable but subordinate to title
    color: COLORS.textSecondary, // Muted gray-blue
    marginTop: SPACING.sm // 8px gap from title
  },

  /* Gold decorative line below the hero text */
  heroDivider: {
    width: 60, // Fixed width — short accent line
    height: 3, // Thin but visible
    backgroundColor: COLORS.primary, // Gold color — brand accent
    marginTop: SPACING.lg, // 24px gap from subtitle
    borderRadius: RADIUS.full // Fully rounded ends (pill shape)
  },

  /* ─── Section Title ─── */

  /* "What would you like to do?" heading above the tiles */
  sectionTitle: {
    fontSize: FONTS.subheading, // 18px
    fontWeight: FONTS.weightSemiBold, // Semi-bold — less heavy than the hero title
    color: COLORS.textPrimary, // White
    marginBottom: SPACING.md // 16px gap before the first tile
  },

  /* ─── Tile Styles ─── */

  /* Each navigation tile — a rounded card with row layout */
  tile: {
    backgroundColor: COLORS.surface, // Slightly lighter navy than background
    borderRadius: RADIUS.lg, // 16px rounded corners — modern look
    padding: SPACING.lg, // 24px internal padding
    marginBottom: SPACING.md, // 16px gap between tiles
    flexDirection: 'row', // Children arranged left-to-right
    alignItems: 'center', // Vertically center the content
    justifyContent: 'space-between', // Push arrow to the right edge
    borderWidth: 1, // Subtle border for definition
    borderColor: COLORS.border // Dark navy border — barely visible
  },

  /* Left section of tile — icon + text container */
  tileContent: {
    flexDirection: 'row', // Icon and text side by side
    alignItems: 'center', // Vertically centered
    flex: 1 // Take available space (push arrow to right)
  },

  /* Emoji icon on the tile */
  tileIcon: {
    fontSize: 32, // Large emoji for visual impact
    marginRight: SPACING.md // 16px gap between icon and text
  },

  /* Text container within the tile (title + description stacked) */
  tileTextContainer: {
    flex: 1 // Take remaining space after the icon
  },

  /* Tile title — e.g., "Chat", "Documents", "Settings" */
  tileTitle: {
    fontSize: FONTS.subheading, // 18px
    fontWeight: FONTS.weightSemiBold, // Semi-bold
    color: COLORS.textPrimary // White
  },

  /* Tile description — helper text below the title */
  tileDescription: {
    fontSize: FONTS.caption, // 14px — smaller than body
    color: COLORS.textSecondary, // Muted gray-blue
    marginTop: SPACING.xs // 4px gap from title
  },

  /* Right-side chevron arrow on each tile */
  tileArrow: {
    fontSize: FONTS.title, // 28px — large enough to be visible
    color: COLORS.textMuted, // Very subtle gray
    marginLeft: SPACING.sm // 8px gap from text content
  },

  /* ─── Footer Styles ─── */

  /* Footer container at the bottom of the screen */
  footer: {
    alignItems: 'center', // Center children horizontally
    marginTop: SPACING.xl, // 32px gap from the last tile
    paddingBottom: SPACING.md // 16px bottom padding
  },

  /* Offline badge — horizontal row with green dot and text */
  offlineBadge: {
    flexDirection: 'row', // Dot and text side by side
    alignItems: 'center', // Vertically centered
    backgroundColor: COLORS.surfaceVariant, // Slightly lighter background for contrast
    paddingHorizontal: SPACING.md, // 16px left/right padding
    paddingVertical: SPACING.sm, // 8px top/bottom padding
    borderRadius: RADIUS.xl // 24px — pill-shaped badge
  },

  /* Small green dot indicating "online/active" status */
  offlineDot: {
    width: 8, // Small circle
    height: 8,
    borderRadius: RADIUS.full, // Fully round
    backgroundColor: COLORS.success, // Green color
    marginRight: SPACING.sm // 8px gap before text
  },

  /* "Fully Offline" text next to the green dot */
  offlineText: {
    fontSize: FONTS.caption, // 14px
    color: COLORS.textSecondary, // Muted gray-blue
    fontWeight: FONTS.weightSemiBold // Semi-bold for emphasis
  },

  /* Version number text at the very bottom */
  versionText: {
    fontSize: FONTS.small, // 12px — smallest text
    color: COLORS.textMuted, // Very subtle — not distracting
    marginTop: SPACING.sm // 8px gap from the offline badge
  }
});

/* Export HomeScreen as default so it can be registered in the navigator */
export default HomeScreen;