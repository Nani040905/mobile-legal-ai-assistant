/*
 * App.tsx — The root entry point of the LegalAI application.
 *
 * PURPOSE: This is the top-level component that React Native renders.
 * It sets up the essential providers that wrap the entire app:
 * 1. SafeAreaProvider — Handles safe area insets for notches/status bars.
 * 2. StatusBar — Controls the appearance of the system status bar.
 * 3. AppNavigator — Our React Navigation stack that manages all screens.
 *
 * DESIGN DECISIONS:
 * - We use 'light-content' StatusBar unconditionally because our app is
 *   dark-mode-only. White status bar text on dark background.
 * - SafeAreaProvider must wrap everything, including the navigator,
 *   so any screen can access safe area insets via the context.
 * - This file is intentionally minimal — all screen logic lives in src/.
 *
 * ENTRY FLOW:
 * index.js → App.tsx → SafeAreaProvider → AppNavigator → HomeScreen
 */

/* Import React — required for JSX transformation */
import React from 'react';

/* StatusBar controls the native status bar (time, battery, signal) appearance */
import { StatusBar } from 'react-native';

/*
 * SafeAreaProvider — A context provider from react-native-safe-area-context.
 * It measures the device's safe area insets (notch, home indicator, status bar)
 * and makes them available to all child components via useSafeAreaInsets().
 * Must be placed near the root of the component tree.
 */
import { SafeAreaProvider } from 'react-native-safe-area-context';

/*
 * AppNavigator — Our custom navigation component that defines all routes.
 * It contains the NavigationContainer and Stack.Navigator with all 5 screens.
 * Imported from the src/navigation/ directory.
 */
import AppNavigator from './src/navigation/AppNavigator';

/*
 * App — The root component of the application.
 *
 * This is a function component (the modern React pattern).
 * It renders three things in order:
 * 1. SafeAreaProvider — wraps everything for safe area support
 * 2. StatusBar — configures the native status bar appearance
 * 3. AppNavigator — the navigation tree with all screens
 */
function App(): React.JSX.Element {
  return (
    /* SafeAreaProvider must be the outermost wrapper for safe area to work */
    <SafeAreaProvider>
      {/*
       * StatusBar configuration:
       * - barStyle='light-content' — white text/icons (for dark backgrounds)
       * - backgroundColor='transparent' — let our app background show through
       * - translucent={true} — Android: draw content behind the status bar
       *   This gives us edge-to-edge display on Android devices.
       */}
      <StatusBar
        barStyle="light-content"       // White status bar text on dark background
        backgroundColor="transparent"  // Transparent so our navy background shows through
        translucent={true}            // Android: content renders behind the status bar
      />

      {/* AppNavigator renders the current screen based on navigation state */}
      <AppNavigator />
    </SafeAreaProvider>
  );
}

/* Export App as the default export — index.js imports this to register the app */
export default App;
