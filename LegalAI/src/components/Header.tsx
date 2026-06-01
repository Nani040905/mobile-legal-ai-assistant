/*
 * Header.tsx — Reusable branded header component.
 *
 * PURPOSE: Provides a consistent header bar across all screens.
 * Displays the app name ("LegalAI") with an optional subtitle,
 * plus an optional back button for non-root screens.
 *
 * DESIGN DECISIONS:
 * - The header is a custom component (not React Navigation's built-in header)
 *   because we need full control over styling, animations, and branding.
 * - Uses our theme tokens for colors and fonts — no hardcoded values.
 * - The back arrow is a simple Unicode character (←) to avoid icon library deps.
 *
 * PROPS:
 * - title: string — The text to display in the header.
 * - subtitle?: string — Optional smaller text below the title.
 * - showBack?: boolean — Whether to show the back arrow button.
 * - onBackPress?: () => void — Callback when back arrow is pressed.
 */

/* Import React — required for JSX transformation in all component files */
import React from 'react';

/* Import the RN primitives we need for layout and interaction */
import {
  View,             // Container for layout — arranges children
  Text,             // Renders text on screen
  StyleSheet,       // Creates optimized style objects (processed at compile time)
  TouchableOpacity, // Touchable wrapper — dims on press for tactile feedback
} from 'react-native';

/* Import our theme tokens for consistent styling */
import { COLORS, FONTS, SPACING } from '../utils/theme';

/*
 * TypeScript interface defining the props this component accepts.
 * Using an interface (vs inline types) makes it easy to extend later
 * and provides clear documentation of the component's API.
 */
interface HeaderProps {
  title: string;           // Required — the main header text
  subtitle?: string;       // Optional — descriptive text below the title
  showBack?: boolean;      // Optional — controls back arrow visibility (default: false)
  onBackPress?: () => void; // Optional — function to call when back is pressed
}

/*
 * Header functional component.
 * React.FC<HeaderProps> tells TypeScript this is a function component
 * that accepts HeaderProps — gives us autocomplete and type checking on usage.
 */
const Header: React.FC<HeaderProps> = ({
  title,       // Destructure the title from props
  subtitle,    // Destructure the optional subtitle
  showBack = false,   // Default to not showing back button
  onBackPress,        // Destructure the optional callback
}) => {
  return (
    /* Main header container — uses row layout to place back button and text side by side */
    <View style={styles.container}>

      {/* Conditionally render the back button only when showBack is true */}
      {showBack && (
        /* TouchableOpacity reduces opacity to 0.7 on press — gives visual tap feedback */
        <TouchableOpacity
          onPress={onBackPress}  // Fire the callback when user taps back
          style={styles.backButton} // Padding for larger touch target (accessibility)
          activeOpacity={0.7}    // How transparent the button gets on press (0 = invisible, 1 = no change)
        >
          {/* Unicode left arrow — simple, no icon library needed for MVP */}
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
      )}

      {/* Text container — holds title and optional subtitle stacked vertically */}
      <View style={styles.textContainer}>
        {/* Main title text — large, bold, white */}
        <Text style={styles.title}>{title}</Text>

        {/* Only render subtitle if it was provided (truthy check) */}
        {subtitle && (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )}
      </View>
    </View>
  );
};

/*
 * StyleSheet.create() — Converts style objects into optimized IDs.
 * This is faster than passing inline style objects on every render
 * because RN only sends the style ID over the bridge, not the full object.
 */
const styles = StyleSheet.create({
  /* Header container — horizontal layout with vertical centering */
  container: {
    flexDirection: 'row',        // Lay children out left-to-right (back button + text)
    alignItems: 'center',        // Vertically center children within the row
    paddingHorizontal: SPACING.lg, // 24px left/right padding from theme
    paddingVertical: SPACING.md,   // 16px top/bottom padding from theme
    backgroundColor: COLORS.background, // Deep navy background from theme
  },

  /* Back button — extra padding makes the touch target larger (accessibility) */
  backButton: {
    marginRight: SPACING.md,     // 16px gap between back arrow and title text
    padding: SPACING.xs,         // 4px padding — increases touchable area
  },

  /* Back arrow text styling — gold accent color, large and bold */
  backArrow: {
    fontSize: FONTS.heading,     // 22px — large enough to tap easily
    color: COLORS.primary,       // Gold accent color — stands out on dark background
    fontWeight: FONTS.weightBold, // Bold weight for visibility
  },

  /* Text container — takes remaining space after back button */
  textContainer: {
    flex: 1, // flex: 1 means "take all available horizontal space"
  },

  /* Title text — prominent white text */
  title: {
    fontSize: FONTS.heading,     // 22px heading size
    fontWeight: FONTS.weightBold, // Bold for emphasis
    color: COLORS.textPrimary,   // White text for maximum contrast on dark bg
  },

  /* Subtitle text — smaller, muted gray-blue */
  subtitle: {
    fontSize: FONTS.caption,       // 14px — smaller than body text
    color: COLORS.textSecondary,   // Gray-blue — less prominent than title
    marginTop: SPACING.xs,        // 4px gap between title and subtitle
  },
});

/* Export the component as default so it can be imported with: import Header from '...' */
export default Header;
