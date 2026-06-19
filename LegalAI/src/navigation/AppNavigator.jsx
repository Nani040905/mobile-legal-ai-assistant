/*
 * AppNavigator.tsx — The root navigation configuration for the app.
 *
 * PURPOSE: Defines ALL the screens in the app and how users can move
 * between them. Uses React Navigation's Native Stack Navigator, which
 * uses native navigation primitives (UINavigationController on iOS,
 * Fragment on Android) for smooth, 60fps transitions.
 *
 * DESIGN DECISIONS:
 * - Native Stack (not JS Stack) — better performance and native feel.
 * - Headers are hidden globally — we use our custom Header component instead.
 * - RootStackParamList is exported so every screen can have type-safe navigation.
 * - NavigationContainer wraps everything — it manages navigation state and links.
 *
 * ROUTE STRUCTURE:
 * Home → Chat
 * Home → Documents → DocumentDetails
 * Home → Settings
 */

/* Import React — needed for JSX in every component file */
import React from 'react';

/* createNativeStackNavigator creates a stack-based navigator using native APIs */
import { createNativeStackNavigator } from '@react-navigation/native-stack';

/* NavigationContainer is the top-level wrapper that holds all navigation state */
import { NavigationContainer } from '@react-navigation/native';

/* Import all screen components that will be registered as routes */
import HomeScreen from '../screens/HomeScreen'; // Landing screen with nav tiles
import ChatScreen from '../screens/ChatScreen'; // AI chat interface
import DocumentsScreen from '../screens/DocumentsScreen'; // PDF upload and list
import DocumentDetailsScreen from '../screens/DocumentDetailsScreen'; // Single doc actions
import SettingsScreen from '../screens/SettingsScreen'; // App settings and model info
import BenchmarkScreen from '../screens/BenchmarkScreen'; // Performance and recall benchmarks
import DebugRetrievalScreen from '../screens/DebugRetrievalScreen'; // BM25 retrieval diagnostic utility
import RiskReportScreen from '../screens/RiskReportScreen'; // Legal audit risk + evidence report
import StrategyScreen from '../screens/StrategyScreen'; // Legal strategy report
import PerspectiveComparisonScreen from '../screens/PerspectiveComparisonScreen'; // Perspective comparison
import CasesScreen from '../screens/CasesScreen'; // Case files list
import CaseDetailsScreen from '../screens/CaseDetailsScreen'; // Case workspace hub
import TimelineScreen from '../screens/TimelineScreen'; // Chronological timeline view

/* Import theme colors so we can style the navigator's background */
import { COLORS } from '../utils/theme';

/*
 * RootStackParamList — TypeScript type that defines ALL routes and their parameters.
 *
 * Each key is a route name, each value is the params that route expects.
 * - `undefined` means the route takes no parameters.
 * - `{ docId: string; docName: string }` means DocumentDetails requires those params.
 *
 * This is EXPORTED so other screens can import it to type their navigation props.
 * Example: NativeStackNavigationProp<RootStackParamList, 'Home'>
 */


































/*
 * Create the stack navigator instance.
 * createNativeStackNavigator<RootStackParamList>() ties the navigator
 * to our type definition, so Stack.Screen names are type-checked.
 * Passing a wrong screen name (e.g., 'Foo') would be a compile error.
 */
const Stack = createNativeStackNavigator();

/*
 * AppNavigator — The root component that defines all navigation routes.
 *
 * This component is rendered once in App.tsx and never unmounts.
 * NavigationContainer manages the navigation tree state internally.
 */
const AppNavigator = () => {
  return (
    /*
     * NavigationContainer — The outermost navigation wrapper.
     * There must be exactly ONE NavigationContainer in the app.
     * It manages the navigation state, handles deep links, and
     * provides the navigation context to all child screens.
     *
     * theme prop — We set the background to our dark navy color
     * so there's no white flash between screen transitions.
     */
    <NavigationContainer
      theme={{
        dark: true, // Tell React Navigation we're using a dark theme
        colors: {
          primary: COLORS.primary, // Gold — used for active tab icons, links
          background: COLORS.background, // Deep navy — screen backgrounds
          card: COLORS.surface, // Slightly lighter navy — header/tab bar bg
          text: COLORS.textPrimary, // White — default text color
          border: COLORS.border, // Subtle border — separators
          notification: COLORS.primary // Gold — notification badges
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' }
        }
      }}>
      
      {/*
        * Stack.Navigator — Manages a stack of screens.
        * Users navigate forward by pushing screens onto the stack,
        * and backward by popping them off (swipe back or back button).
        *
        * initialRouteName="Home" — The app always starts on HomeScreen.
        * screenOptions — Global options applied to ALL screens in this navigator.
        */}
      <Stack.Navigator
        initialRouteName="Home" // App launches on the Home screen
        screenOptions={{
          headerShown: false, // Hide the default header — we use our custom Header component
          contentStyle: {
            backgroundColor: COLORS.background // Prevent white flash during transitions
          },
          animation: 'slide_from_right' // New screens slide in from the right (natural UX)
        }}>
        
        {/*
          * Each Stack.Screen registers a route name and its component.
          * The name MUST match a key in RootStackParamList (TypeScript enforces this).
          */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Documents" component={DocumentsScreen} />
        <Stack.Screen name="DocumentDetails" component={DocumentDetailsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Benchmark" component={BenchmarkScreen} />
        <Stack.Screen name="DebugRetrieval" component={DebugRetrievalScreen} />
        <Stack.Screen name="RiskReport" component={RiskReportScreen} />
        <Stack.Screen name="Strategy" component={StrategyScreen} />
        <Stack.Screen name="PerspectiveComparison" component={PerspectiveComparisonScreen} />
        <Stack.Screen name="Cases" component={CasesScreen} />
        <Stack.Screen name="CaseDetails" component={CaseDetailsScreen} />
        <Stack.Screen name="Timeline" component={TimelineScreen} />
      </Stack.Navigator>
    </NavigationContainer>);

};

/* Export the navigator as default — imported in App.tsx */
export default AppNavigator;