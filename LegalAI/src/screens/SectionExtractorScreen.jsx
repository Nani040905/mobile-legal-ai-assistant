import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import useCaseStore from '../store/useCaseStore';
import { extractSectionsFromCase, explainSection } from '../services/sectionExtractor';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

const SectionExtractorScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const caseId = route.params?.caseId || null;

  const caseObj = useCaseStore((state) => caseId ? state.getCaseById(caseId) : null);

  const [isScanning, setIsScanning] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [explanation, setExplanation] = useState(null);

  const handleRunScan = async () => {
    if (!caseObj) {
      Alert.alert('Error', 'Please open this from a case folder to scan documents.');
      return;
    }

    setIsScanning(true);
    setProgressText('Analyzing documents...');
    setSections([]);
    setSelectedSection(null);
    setExplanation(null);

    try {
      const results = await extractSectionsFromCase(caseId, (text) => {
        setProgressText(text);
      });
      setSections(results);
      if (results.length === 0) {
        Alert.alert('Scan Complete', 'No specific Indian legal acts or sections were found in these documents.');
      }
    } catch (err) {
      Alert.alert('Scan Error', err.message || 'An error occurred during scan.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectSection = async (item) => {
    setSelectedSection(item.sectionCode);
    setIsExplaining(true);
    setExplanation(null);

    try {
      const result = await explainSection(item.sectionCode, item.actName);
      setExplanation(result);
    } catch (err) {
      Alert.alert('Explanation Error', err.message || 'Could not fetch explanation.');
      setSelectedSection(null);
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Indian Law Sections 📖"
        subtitle={caseObj ? caseObj.title : 'Standalone Extractor'}
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      {isScanning ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{progressText}</Text>
          <Text style={styles.loadingSubtext}>
            Scanning linked files to identify relevant sections and acts...
          </Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {sections.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📖</Text>
              <Text style={styles.emptyTitle}>Indian Law Section Extractor</Text>
              <Text style={styles.emptyDesc}>
                Extract Acts/Sections (such as IPC/BNS sections) mentioned in linked case documents, and review detailed ingredient analyses, penalties, defenses, and common courtroom errors.
              </Text>
              <TouchableOpacity style={styles.actionBtn} onPress={handleRunScan}>
                <Text style={styles.actionBtnText}>Scan Documents for Sections</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.splitLayout}>
              {/* Left Side: Extracted Sections List */}
              <View style={styles.listCol}>
                <Text style={styles.listHeader}>Extracted Sections ({sections.length})</Text>
                <ScrollView contentContainerStyle={styles.listScroll} showsVerticalScrollIndicator={false}>
                  {sections.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.sectionListItem,
                        selectedSection === item.sectionCode && styles.sectionListItemActive
                      ]}
                      onPress={() => handleSelectSection(item)}
                    >
                      <Text style={[styles.sectionItemCode, selectedSection === item.sectionCode && styles.sectionItemCodeActive]}>
                        {item.sectionCode}
                      </Text>
                      <Text style={styles.sectionItemAct} numberOfLines={1}>
                        {item.actName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={styles.reScanBtn} onPress={handleRunScan}>
                    <Text style={styles.reScanBtnText}>Re-Scan</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Right Side: Explanation Panel */}
              <View style={styles.explainCol}>
                {isExplaining ? (
                  <View style={styles.explainLoading}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.explainLoadingText}>Analyzing section details...</Text>
                  </View>
                ) : explanation ? (
                  <ScrollView contentContainerStyle={styles.explainScroll} showsVerticalScrollIndicator={false}>
                    <View style={styles.explainHeader}>
                      <Text style={styles.explainTitle}>{explanation.sectionCode}</Text>
                      <Text style={styles.explainSubtitle}>{explanation.actName}</Text>
                    </View>

                    {/* Penalty Banner */}
                    <View style={styles.penaltyCard}>
                      <Text style={styles.penaltyLabel}>⚖️ Penalty / Punishment</Text>
                      <Text style={styles.penaltyText}>{explanation.penalty}</Text>
                    </View>

                    {/* Common Mistakes Warning Cards */}
                    {explanation.commonMistakes && explanation.commonMistakes.length > 0 && (
                      <View style={styles.mistakesCard}>
                        <Text style={styles.mistakesLabel}>🚨 Common Strategic Mistakes</Text>
                        {explanation.commonMistakes.map((mistake, i) => (
                          <View key={i} style={styles.mistakeItem}>
                            <Text style={styles.mistakeBullet}>⚠️</Text>
                            <Text style={styles.mistakeText}>{mistake}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Ingredients */}
                    <Text style={styles.sublabel}>Core Ingredients</Text>
                    {explanation.ingredients.map((ing, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Text style={styles.bullet}>•</Text>
                        <Text style={styles.bulletText}>{ing}</Text>
                      </View>
                    ))}

                    {/* Burden */}
                    <Text style={styles.sublabel}>Burden of Proof</Text>
                    <Text style={styles.bodyText}>{explanation.burden}</Text>

                    {/* Defenses */}
                    <Text style={styles.sublabel}>Possible Defenses</Text>
                    {explanation.defenses.map((def, i) => (
                      <View key={i} style={styles.bulletRow}>
                        <Text style={[styles.bullet, { color: COLORS.success }]}>✓</Text>
                        <Text style={styles.bulletText}>{def}</Text>
                      </View>
                    ))}

                    {/* Related Sections */}
                    {explanation.relatedSections && explanation.relatedSections.length > 0 && (
                      <View>
                        <Text style={styles.sublabel}>Related Provisions</Text>
                        <Text style={styles.bodyText}>{explanation.relatedSections.join(', ')}</Text>
                      </View>
                    )}
                  </ScrollView>
                ) : (
                  <View style={styles.explainPlaceholder}>
                    <Text style={styles.explainPlaceholderIcon}>👈</Text>
                    <Text style={styles.explainPlaceholderText}>Select a section on the left to view detailed explanation.</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg
  },
  loadingText: {
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    textAlign: 'center'
  },
  loadingSubtext: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center'
  },
  contentContainer: {
    flex: 1
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl
  },
  emptyIcon: {
    fontSize: 48,
    color: COLORS.primary,
    marginBottom: SPACING.md
  },
  emptyTitle: {
    fontSize: FONTS.heading,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center'
  },
  emptyDesc: {
    fontSize: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    alignItems: 'center'
  },
  actionBtnText: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    color: COLORS.background
  },
  splitLayout: {
    flex: 1,
    flexDirection: 'row'
  },
  listCol: {
    width: '35%',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    backgroundColor: COLORS.surface + '40'
  },
  listHeader: {
    fontSize: FONTS.small,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    padding: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  listScroll: {
    padding: SPACING.xs
  },
  sectionListItem: {
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xs,
    backgroundColor: COLORS.surface
  },
  sectionListItemActive: {
    backgroundColor: COLORS.primary + '20',
    borderWidth: 1,
    borderColor: COLORS.primary
  },
  sectionItemCode: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary
  },
  sectionItemCodeActive: {
    color: COLORS.primary
  },
  sectionItemAct: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2
  },
  reScanBtn: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center'
  },
  reScanBtnText: {
    fontSize: FONTS.small,
    color: COLORS.textSecondary
  },
  explainCol: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  explainLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  explainLoadingText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm
  },
  explainPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg
  },
  explainPlaceholderIcon: {
    fontSize: 24,
    color: COLORS.textMuted,
    marginBottom: SPACING.sm
  },
  explainPlaceholderText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18
  },
  explainScroll: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl
  },
  explainHeader: {
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs
  },
  explainTitle: {
    fontSize: FONTS.heading,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary
  },
  explainSubtitle: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary
  },
  penaltyCard: {
    backgroundColor: COLORS.surfaceVariant + '40',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary
  },
  penaltyLabel: {
    fontSize: FONTS.caption,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4
  },
  penaltyText: {
    fontSize: FONTS.caption,
    color: COLORS.textPrimary,
    lineHeight: 18
  },
  mistakesCard: {
    backgroundColor: COLORS.error + '10',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.error + '40'
  },
  mistakesLabel: {
    fontSize: FONTS.caption,
    fontWeight: 'bold',
    color: COLORS.error,
    marginBottom: SPACING.sm
  },
  mistakeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs
  },
  mistakeBullet: {
    fontSize: 12,
    marginRight: SPACING.sm,
    marginTop: 2
  },
  mistakeText: {
    fontSize: FONTS.caption,
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: 18
  },
  sublabel: {
    fontSize: FONTS.caption,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs
  },
  bodyText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    lineHeight: 18
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4
  },
  bullet: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
    marginRight: SPACING.xs
  },
  bulletText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18
  }
});

export default SectionExtractorScreen;
