/*
 * DebugRetrievalScreen.tsx — Screen for diagnosing BM25 retrieval and document chunking.
 *
 * PURPOSE: Provides an interactive developer utility to enter search queries,
 * select any indexed document, and view the top-10 BM25 scored chunks.
 *
 * DESIGN DECISIONS:
 * - Clean dark mode UI matching the rest of the application.
 * - Horizontal scrolling document selector chips for high density.
 * - Animated, expandable cards for reading full chunk texts without cluttering the list.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,

  LayoutAnimation,
  Platform,
  UIManager } from
'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import useDocumentStore from '../store/useDocumentStore';
import { search } from '../services/retrievalService';

// Enable LayoutAnimation for Android to support smooth expandable cards
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DebugRetrievalScreen = () => {
  const navigation = useNavigation();
  const documents = useDocumentStore((state) => state.documents);

  const [selectedDocId, setSelectedDocId] = useState(
    documents.length > 0 ? documents[0].id : ''
  );
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [expandedChunks, setExpandedChunks] = useState(new Set());

  const activeDoc = documents.find((d) => d.id === selectedDocId);

  const handleSearch = () => {
    if (!activeDoc || !activeDoc.chunks) {
      setResults([]);
      setSearched(true);
      return;
    }

    // Run BM25 search to retrieve top 10 matches (default is top 3 in the service)
    const searchResults = search(query, activeDoc.chunks, 10);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setResults(searchResults);
    setSearched(true);
    setExpandedChunks(new Set()); // Reset expansions on new search
  };

  const toggleExpand = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const next = new Set(expandedChunks);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setExpandedChunks(next);
  };

  const renderResultItem = ({ item, index }) => {
    const isExpanded = expandedChunks.has(item.index);
    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => toggleExpand(item.index)}
        activeOpacity={0.9}>
        
        <View style={styles.cardHeader}>
          <View style={styles.badgeRow}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            <Text style={styles.chunkLabel}>Chunk #{item.index + 1}</Text>
          </View>
          <Text style={styles.scoreText}>Score: {item.score.toFixed(4)}</Text>
        </View>

        <Text
          style={styles.chunkText}
          numberOfLines={isExpanded ? undefined : 3}
          ellipsizeMode="tail">
          
          {item.chunk}
        </Text>

        <Text style={styles.expandAction}>
          {isExpanded ? 'Collapse ▲' : 'Expand Full Text ▼'}
        </Text>
      </TouchableOpacity>);

  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Retrieval Debugger"
        subtitle="BM25 Chunk Inspector"
        showBack={true}
        onBackPress={() => navigation.goBack()} />
      

      <ScrollView style={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Document Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Select Target Document</Text>
          {documents.length === 0 ?
          <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No documents indexed yet. Please upload a PDF document under the Documents screen.
              </Text>
            </View> :

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.docSelectorContainer}>
            
              {documents.map((doc) => {
              const isSelected = selectedDocId === doc.id;
              return (
                <TouchableOpacity
                  key={doc.id}
                  style={[styles.docChip, isSelected && styles.docChipActive]}
                  onPress={() => {
                    setSelectedDocId(doc.id);
                    setResults([]);
                    setSearched(false);
                  }}>
                  
                    <Text style={[styles.docChipText, isSelected && styles.docChipTextActive]}>
                      📄 {doc.name}
                    </Text>
                  </TouchableOpacity>);

            })}
            </ScrollView>
          }
        </View>

        {/* Query Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Enter Search Query</Text>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              placeholder="Type test keywords or question..."
              placeholderTextColor={COLORS.textMuted}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch} />
            
            <TouchableOpacity
              style={[styles.searchButton, !activeDoc && styles.disabledButton]}
              onPress={handleSearch}
              disabled={!activeDoc}>
              
              <Text style={styles.searchButtonText}>🔍 Run</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results */}
        <View style={[styles.section, { flex: 1, paddingBottom: SPACING.xl }]}>
          <Text style={styles.sectionTitle}>3. BM25 Scoring Analysis (Top 10)</Text>

          {!searched &&
          <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>
                Select a document, type your query, and press Run to inspect chunk relevance scores.
              </Text>
            </View>
          }

          {searched && results.length === 0 &&
          <View style={styles.infoBox}>
              <Text style={styles.infoBoxText}>
                No matching chunks found for this query. Make sure the document is successfully chunked (uploaded).
              </Text>
            </View>
          }

          {results.map((item, idx) =>
          <View key={item.index}>
              {renderResultItem({ item, index: idx })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>);

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContainer: {
    flex: 1
  },
  section: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md
  },
  sectionTitle: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.sm
  },
  docSelectorContainer: {
    paddingVertical: SPACING.xs
  },
  docChip: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm
  },
  docChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(212, 175, 55, 0.1)'
  },
  docChipText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weightSemiBold
  },
  docChipTextActive: {
    color: COLORS.primary
  },
  emptyContainer: {
    backgroundColor: 'rgba(252, 129, 129, 0.1)',
    borderColor: COLORS.error,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md
  },
  emptyText: {
    color: COLORS.error,
    fontSize: FONTS.caption,
    lineHeight: 20
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    color: COLORS.textPrimary,
    fontSize: FONTS.body,
    marginRight: SPACING.sm
  },
  searchButton: {
    height: 48,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center'
  },
  disabledButton: {
    backgroundColor: COLORS.border,
    opacity: 0.5
  },
  searchButtonText: {
    color: COLORS.background,
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold
  },
  infoBox: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  infoBoxText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.caption,
    textAlign: 'center',
    lineHeight: 20
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  rankBadge: {
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    marginRight: SPACING.sm
  },
  rankText: {
    fontSize: 12,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary
  },
  chunkLabel: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary
  },
  scoreText: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary
  },
  chunkText: {
    fontSize: FONTS.caption,
    color: COLORS.textPrimary,
    lineHeight: 20
  },
  expandAction: {
    fontSize: 12,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
    marginTop: SPACING.sm,
    textAlign: 'right'
  }
});

export default DebugRetrievalScreen;