import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';







export const CitationPanel = ({ citations, onCitationPress }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!citations || citations.length === 0) {
    return null;
  }

  // Normalize scores to be reasonable percentages if needed (max score can vary in BM25, so we cap/relative scale or just format)
  // Let's cap score display or show a relevance indicator
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}>
        
        <View style={styles.headerTitleContainer}>
          <Text style={styles.bookIcon}>📚</Text>
          <Text style={styles.headerText}>
            Sources Used ({citations.length})
          </Text>
        </View>
        <Text style={styles.arrowIcon}>{isExpanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {isExpanded &&
      <View style={styles.listContainer}>
          {citations.map((item, index) => {
          // Normalize BM25 score display: since BM25 can be > 1.0, we just show the raw score formatted, or an indicator
          const displayScore = item.score > 0 ? `Score: ${item.score.toFixed(2)}` : 'Relevant';
          return (
            <TouchableOpacity
              key={`${item.documentName}-${item.chunkIndex}-${index}`}
              style={styles.card}
              onPress={() => onCitationPress && onCitationPress(item)}
              disabled={!onCitationPress}
              activeOpacity={0.7}>
              
                <View style={styles.cardHeader}>
                  <Text style={styles.docName} numberOfLines={1}>
                    {item.documentName}
                  </Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Chunk {item.chunkIndex + 1}</Text>
                  </View>
                </View>
                <Text style={styles.previewText} numberOfLines={3}>
                  {item.text.trim()}
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.scoreText}>{displayScore}</Text>
                  {onCitationPress &&
                <Text style={styles.jumpText}>Tap to view →</Text>
                }
                </View>
              </TouchableOpacity>);

        })}
        </View>
      }
    </View>);

};

const styles = StyleSheet.create({
  container: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceVariant,
    overflow: 'hidden'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  bookIcon: {
    fontSize: FONTS.caption,
    marginRight: SPACING.xs
  },
  headerText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightSemiBold
  },
  arrowIcon: {
    color: COLORS.textSecondary,
    fontSize: FONTS.small
  },
  listContainer: {
    padding: SPACING.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.2)'
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs
  },
  docName: {
    color: COLORS.textPrimary,
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightSemiBold,
    flex: 1,
    marginRight: SPACING.sm
  },
  badge: {
    backgroundColor: 'rgba(10, 132, 255, 0.15)',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.3)'
  },
  badgeText: {
    color: '#0A84FF',
    fontSize: 10,
    fontWeight: 'bold'
  },
  previewText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.small,
    lineHeight: 16,
    marginBottom: SPACING.xs
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: SPACING.xs
  },
  scoreText: {
    color: COLORS.textSecondary,
    fontSize: 10
  },
  jumpText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: FONTS.weightSemiBold
  }
});