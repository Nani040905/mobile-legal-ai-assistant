import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import useCaseStore from '../store/useCaseStore';
import { prepareHearingBrief } from '../services/hearingPrep';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

const HearingPrepScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { caseId, caseTitle } = route.params;

  const caseObj = useCaseStore((state) => state.getCaseById(caseId));
  const setHearingBrief = useCaseStore((state) => state.setHearingBrief);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [perspective, setPerspective] = useState('defense'); // Default to defense
  const [brief, setBrief] = useState(null);

  useEffect(() => {
    if (caseObj?.hearingBrief) {
      setBrief(caseObj.hearingBrief);
    }
  }, [caseObj?.hearingBrief]);

  const handleRunScan = async () => {
    if (!caseObj) {
      Alert.alert('Error', 'Case folder not found.');
      return;
    }

    setIsAnalyzing(true);
    setProgressText('Initializing hearing prep builder...');
    setProgressPercent(0);
    setBrief(null);

    try {
      const result = await prepareHearingBrief(caseId, perspective, (text, current, total) => {
        setProgressText(text);
        setProgressPercent(total > 0 ? (current / total) * 100 : 0);
      });

      setBrief(result);
      setHearingBrief(caseId, result);
    } catch (e) {
      Alert.alert('Scan Error', e.message || 'An error occurred during brief compilation.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExport = async () => {
    if (!brief) return;

    const briefText = `HEARING PREPARATION BRIEF: ${caseObj.title}
Client: ${caseObj.clientName}
Court: ${caseObj.court}
Type: ${caseObj.caseType}
Prepared Perspective: ${perspective.toUpperCase()}
Evidentiary Confidence: ${brief.confidence}%

--------------------------------------------------
KEY FACTS:
${brief.keyFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}

--------------------------------------------------
IMPORTANT DATES:
${brief.importantDates.map((d, i) => `${i + 1}. ${d}`).join('\n')}

--------------------------------------------------
STRONGEST ARGUMENTS:
${brief.strongestArguments.map((a, i) => `${i + 1}. ${a}`).join('\n')}

--------------------------------------------------
WEAKEST POINTS & VULNERABILITIES:
${brief.weakestPoints.map((w, i) => `${i + 1}. ${w}`).join('\n')}

--------------------------------------------------
QUESTIONS COURT/JUDGE MAY ASK:
${brief.questionsCourtMayAsk.map((q, i) => `${i + 1}. ${q}`).join('\n')}

--------------------------------------------------
QUESTIONS OPPONENT MAY ASK:
${brief.questionsOpponentMayAsk.map((q, i) => `${i + 1}. ${q}`).join('\n')}

--------------------------------------------------
REQUIRED DOCUMENTS TO CARRY:
${brief.documentsToCarry.map((d, i) => `${i + 1}. ${d}`).join('\n')}
`;

    try {
      await Share.share({
        title: `Hearing Brief - ${caseObj.title}`,
        message: briefText
      });
    } catch (err) {
      Alert.alert('Export Failed', err.message);
    }
  };

  const renderSection = (title, icon, items, bulletColor = COLORS.primary) => {
    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>{icon}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.sectionBody}>
          {(!items || items.length === 0) ? (
            <Text style={styles.noItemsText}>No information extracted for this section.</Text>
          ) : (
            items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={[styles.bullet, { color: bulletColor }]}>•</Text>
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Hearing Prep ⚡"
        subtitle={caseTitle}
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      {isAnalyzing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>{progressText}</Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>
          <Text style={styles.loadingSubtext}>
            Aggregating documents, facts, dates, and arguments to compile your comprehensive court brief...
          </Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {!brief ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>⚡</Text>
              <Text style={styles.emptyTitle}>Hearing Preparation Brief</Text>
              <Text style={styles.emptyDesc}>
                Synthesize all case documents to generate a ready-to-use hearing preparation brief. The brief will extract key facts, dates, argument lines, and prep you for court-room questions.
              </Text>

              {/* Perspective Picker */}
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerLabel}>Select Your Representation Perspective:</Text>
                <View style={styles.pickerRow}>
                  <TouchableOpacity
                    style={[styles.pickerOpt, perspective === 'prosecution' && styles.pickerOptActive]}
                    onPress={() => setPerspective('prosecution')}
                  >
                    <Text style={[styles.pickerOptText, perspective === 'prosecution' && styles.pickerOptTextActive]}>
                      Prosecution / Plaintiff
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pickerOpt, perspective === 'defense' && styles.pickerOptActive]}
                    onPress={() => setPerspective('defense')}
                  >
                    <Text style={[styles.pickerOptText, perspective === 'defense' && styles.pickerOptTextActive]}>
                      Defense / Respondent
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.actionBtn} onPress={handleRunScan}>
                <Text style={styles.actionBtnText}>Build Hearing Brief</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Brief Overview Header */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryTitle}>Brief Compiled</Text>
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>{brief.confidence}% Confidence</Text>
                  </View>
                </View>
                <Text style={styles.summaryDesc}>
                  Prepared for {perspective === 'defense' ? 'Defense/Respondent' : 'Prosecution/Plaintiff'} representation.
                </Text>
                <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
                  <Text style={styles.exportBtnText}>📤 Export & Share Brief</Text>
                </TouchableOpacity>
              </View>

              {/* Brief Sections */}
              {renderSection('Key Factual Points', '📋', brief.keyFacts)}
              {renderSection('Important Dates & Chronology', '📅', brief.importantDates, COLORS.warning)}
              {renderSection('Strongest Legal Arguments', '💪', brief.strongestArguments, COLORS.success)}
              {renderSection('Weakest Points & Vulnerabilities', '⚠️', brief.weakestPoints, COLORS.error)}
              {renderSection('Questions the Opponent May Ask', '🎯', brief.questionsOpponentMayAsk)}
              {renderSection('Likely Court & Judge Questions', '⚖️', brief.questionsCourtMayAsk)}
              {renderSection('Documents Recommended to Carry', '📁', brief.documentsToCarry)}

              <View style={styles.reScanContainer}>
                <Text style={styles.reScanLabel}>Need to adjust perspective or re-scan?</Text>
                <View style={styles.pickerRow}>
                  <TouchableOpacity
                    style={[styles.pickerOptSmall, perspective === 'prosecution' && styles.pickerOptActive]}
                    onPress={() => setPerspective('prosecution')}
                  >
                    <Text style={[styles.pickerOptTextSmall, perspective === 'prosecution' && styles.pickerOptTextActive]}>
                      Prosecution
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pickerOptSmall, perspective === 'defense' && styles.pickerOptActive]}
                    onPress={() => setPerspective('defense')}
                  >
                    <Text style={[styles.pickerOptTextSmall, perspective === 'defense' && styles.pickerOptTextActive]}>
                      Defense
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.reScanBtn} onPress={handleRunScan}>
                  <Text style={styles.reScanBtnText}>Re-Build Brief</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  progressBarContainer: {
    width: '80%',
    height: 6,
    backgroundColor: COLORS.surfaceVariant,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.md,
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary
  },
  loadingSubtext: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.md
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
  pickerContainer: {
    width: '100%',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  pickerLabel: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weightSemiBold,
    marginBottom: SPACING.sm,
    textAlign: 'center'
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  },
  pickerOpt: {
    flex: 1,
    backgroundColor: COLORS.surfaceVariant,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  pickerOptActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary
  },
  pickerOptText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weightSemiBold
  },
  pickerOptTextActive: {
    color: COLORS.primary,
    fontWeight: FONTS.weightBold
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
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs
  },
  summaryTitle: {
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary
  },
  confidenceBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.success
  },
  confidenceText: {
    fontSize: FONTS.small - 2,
    color: COLORS.success,
    fontWeight: FONTS.weightBold
  },
  summaryDesc: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md
  },
  exportBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center'
  },
  exportBtnText: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightBold,
    color: COLORS.background
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SPACING.xs
  },
  sectionIcon: {
    fontSize: 18,
    marginRight: SPACING.sm
  },
  sectionTitle: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary
  },
  sectionBody: {
    paddingLeft: SPACING.xs
  },
  noItemsText: {
    fontSize: FONTS.caption,
    color: COLORS.textMuted,
    fontStyle: 'italic'
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs
  },
  bullet: {
    fontSize: 18,
    marginRight: SPACING.sm,
    lineHeight: 18
  },
  itemText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18
  },
  reScanContainer: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center'
  },
  reScanLabel: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weightSemiBold,
    marginBottom: SPACING.sm
  },
  pickerOptSmall: {
    flex: 1,
    backgroundColor: COLORS.surfaceVariant,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  pickerOptTextSmall: {
    fontSize: FONTS.small,
    color: COLORS.textSecondary
  },
  reScanBtn: {
    marginTop: SPACING.md,
    width: '100%',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center'
  },
  reScanBtnText: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary
  }
});

export default HearingPrepScreen;
