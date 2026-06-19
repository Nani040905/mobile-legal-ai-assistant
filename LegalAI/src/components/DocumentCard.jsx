/*
 * DocumentCard.tsx — A single document list item component.
 *
 * PURPOSE: Renders one document entry in the Documents screen list.
 * Shows the document name, upload date, file size, and provides
 * a delete button. Tapping the card navigates to DocumentDetails.
 *
 * DESIGN DECISIONS:
 * - Card-based layout — consistent with the Home screen tile design.
 * - Swipe-to-delete not implemented yet — using a delete icon button instead.
 * - File size formatted in human-readable units (KB, MB).
 * - Date formatted as a short locale string for readability.
 *
 * PROPS:
 * - document: Document — The document metadata object from the store.
 * - onPress: () => void — Callback when the card is tapped (navigate to details).
 * - onDelete: () => void — Callback when the delete button is tapped.
 */

/* Import React — required for JSX */
import React from 'react';

/* Import RN components */
import {
  View, // Layout container
  Text, // Text rendering
  StyleSheet, // Optimized styles
  TouchableOpacity // Touchable wrapper with opacity feedback
} from 'react-native';

/* Import the Document type from our store */


/* Import theme tokens */
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

/*
 * Props interface for the DocumentCard component.
 */






/*
 * formatFileSize — Converts bytes to a human-readable string.
 *
 * @param bytes — File size in bytes.
 * @returns A formatted string like "2.4 MB" or "150 KB".
 *
 * Uses a simple algorithm:
 * - Less than 1024 bytes → show as bytes
 * - Less than 1024 KB → show as KB with 1 decimal
 * - Otherwise → show as MB with 1 decimal
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) {
    return 'Unknown size'; // Size not available (stub returns 0)
  }

  /* Convert bytes to kilobytes */
  const kb = bytes / 1024;

  if (kb < 1) {
    return `${bytes} B`; // Very small files — show in bytes
  }

  /* Convert kilobytes to megabytes */
  const mb = kb / 1024;

  if (mb < 1) {
    return `${kb.toFixed(1)} KB`; // Under 1 MB — show in KB with 1 decimal
  }

  return `${mb.toFixed(1)} MB`; // 1 MB or more — show in MB with 1 decimal
};

/*
 * formatDate — Converts an ISO date string to a readable short date.
 *
 * @param isoString — ISO 8601 date string (e.g., "2024-01-15T10:30:00.000Z").
 * @returns A short date string in the user's locale (e.g., "Jan 15, 2024").
 */
const formatDate = (isoString) => {
  /* Parse the ISO string into a Date object */
  const date = new Date(isoString);

  /* Format using the user's locale with medium date style */
  return date.toLocaleDateString(undefined, {
    year: 'numeric', // Full year (e.g., "2024")
    month: 'short', // Abbreviated month (e.g., "Jan")
    day: 'numeric' // Day number (e.g., "15")
  });
};

/*
 * DocumentCard — Renders a single document entry as a card.
 *
 * Layout:
 * [📄 PDF icon] [Name + Date + Size] [🗑️ Delete button]
 */
const DocumentCard = ({ document, onPress, onDelete }) => {
  return (
    /*
     * Outer TouchableOpacity — the entire card is tappable.
     * Tapping navigates to the DocumentDetails screen.
     */
    <TouchableOpacity
      style={styles.card}
      onPress={onPress} // Navigate to document details
      activeOpacity={0.8} // Slight dim on press for tactile feedback
    >
      {/* Left section — PDF icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📄</Text>
      </View>

      {/* Middle section — document info (name, date, size) */}
      <View style={styles.infoContainer}>
        {/* Document file name — bold, white, truncated if too long */}
        <Text style={styles.name} numberOfLines={1}>
          {document.name}
        </Text>

        {/* Metadata row — date and size on the same line */}
        <View style={styles.metaRow}>
          {/* Upload date */}
          <Text style={styles.metaText}>{formatDate(document.uploadedAt)}</Text>

          {/* Dot separator between date and size */}
          <Text style={styles.metaDot}>•</Text>

          {/* File size */}
          <Text style={styles.metaText}>{formatFileSize(document.size)}</Text>
        </View>

        {/* Status indicator — shows if text has been extracted */}
        {document.extractedText &&
        <View style={styles.extractedBadge}>
            <Text style={styles.extractedText}>✓ Text extracted</Text>
          </View>
        }
      </View>

      {/* Right section — delete button */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={(e) => {
          /*
           * Stop the event from propagating to the outer TouchableOpacity.
           * Without this, tapping delete would ALSO trigger onPress (navigate).
           * e.stopPropagation() prevents the parent from receiving the tap event.
           */
          e.stopPropagation();
          onDelete(); // Call the delete callback
        }}
        activeOpacity={0.7}>
        
        <Text style={styles.deleteIcon}>🗑️</Text>
      </TouchableOpacity>
    </TouchableOpacity>);

};

/*
 * Styles for the document card.
 */
const styles = StyleSheet.create({
  /* Card container — horizontal row with border and rounded corners */
  card: {
    flexDirection: 'row', // Horizontal layout: icon + info + delete
    alignItems: 'center', // Vertically centered
    backgroundColor: COLORS.surface, // Slightly lighter navy
    borderRadius: RADIUS.lg, // 16px rounded corners
    padding: SPACING.md, // 16px padding
    marginBottom: SPACING.sm, // 8px gap between cards
    borderWidth: 1, // Subtle border
    borderColor: COLORS.border // Dark navy border
  },

  /* PDF icon container — fixed size, centered */
  iconContainer: {
    width: 44, // Fixed width
    height: 44, // Fixed height — square
    borderRadius: RADIUS.md, // 12px rounded
    backgroundColor: COLORS.surfaceVariant, // Slightly different background for contrast
    justifyContent: 'center', // Center icon vertically
    alignItems: 'center', // Center icon horizontally
    marginRight: SPACING.md // 16px gap before info text
  },

  /* PDF emoji icon */
  icon: {
    fontSize: 22 // Medium size
  },

  /* Info container — takes remaining space between icon and delete button */
  infoContainer: {
    flex: 1 // Take all available horizontal space
  },

  /* Document name text — bold, white, single line with truncation */
  name: {
    fontSize: FONTS.body, // 16px
    fontWeight: FONTS.weightSemiBold, // Semi-bold
    color: COLORS.textPrimary, // White
    marginBottom: SPACING.xs // 4px gap before metadata
  },

  /* Metadata row — date and size side by side */
  metaRow: {
    flexDirection: 'row', // Horizontal layout
    alignItems: 'center' // Vertically centered
  },

  /* Date and size text */
  metaText: {
    fontSize: FONTS.small, // 12px
    color: COLORS.textMuted // Subtle gray
  },

  /* Dot separator between date and size */
  metaDot: {
    fontSize: FONTS.small,
    color: COLORS.textMuted,
    marginHorizontal: SPACING.xs // 4px gap on each side
  },

  /* "Text extracted" badge */
  extractedBadge: {
    marginTop: SPACING.xs // 4px gap from metadata row
  },

  /* Badge text */
  extractedText: {
    fontSize: FONTS.small, // 12px
    color: COLORS.success // Green — positive indicator
  },

  /* Delete button container — provides padding for larger touch target */
  deleteButton: {
    padding: SPACING.sm, // 8px padding — makes the button easier to tap
    marginLeft: SPACING.sm // 8px gap from info text
  },

  /* Delete emoji icon */
  deleteIcon: {
    fontSize: 18 // Slightly smaller than the PDF icon
  }
});

/* Export for use in DocumentsScreen */
export default DocumentCard;