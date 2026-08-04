import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import useCaseStore from '../store/useCaseStore';
import { generateClientQuestions } from '../services/clientQuestionGenerator';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

const ClientQuestionsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { caseId, caseTitle } = route.params;

  const caseObj = useCaseStore((state) => state.getCaseById(caseId));
  const setClientQuestions = useCaseStore((state) => state.setClientQuestions);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (caseObj?.clientQuestions) {
      setReport(caseObj.clientQuestions);
    }
  }, [caseObj?.clientQuestions]);

  const handleRunScan = async () => {
    if (!caseObj) {
      Alert.alert('Error', 'Case folder not found.');
      return;
    }

    setIsAnalyzing(true);
    setProgressText('Analyzing case gaps...');
    setProgressPercent(0);
    setReport(null);

    try {
      const result = await generateClientQuestions(caseId, (text, current, total) => {
        setProgressText(text);
        setProgressPercent(total > 0 ? (current / total) * 100 : 0);
      });

      setReport(result);
      setClientQuestions(caseId, result);
    } catch (e) {
      Alert.alert('Scan Error', e.message || 'An error occurred during scan.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderSection = (title, icon, items, themeColor = COLORS.primary) => {
    return (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>{icon}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.sectionBody}>
          {(!items || items.length === 0) ? (
            <Text style={styles.noItemsText}>No items generated for this section.</Text>
          ) : (
            items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={[styles.numberCircle, { backgroundColor: themeColor + '20', borderColor: themeColor }]}>
                  <Text style={[styles.numberText, { color: themeColor }]}>{idx + 1}</Text>
                </View>
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
        title="Client Questions ❓"
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
            Scanning linked files to formulate clarifying questions and missing evidence requests...
          </Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {!report ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>❓</Text>
              <Text style={styles.emptyTitle}>Client Interview Prep</Text>
              <Text style={styles.emptyDesc}>
                Prepare for your next client meeting. The generator reviews all current files to identify factual gaps, draft a clarifying questionnaire, list missing documents to request, and outline urgent action tasks.
              </Text>
              <TouchableOpacity style={styles.actionBtn} onPress={handleRunScan}>
                <Text style={styles.actionBtnText}>Build Interview Questionnaire</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Interview Brief Prepared</Text>
                <Text style={styles.summaryDesc}>
                  Use these questions and action lists to guide your next meeting with client {caseObj.clientName}.
                </Text>
              </View>

              {renderSection('Questions to Ask Client', '💬', report.questions, COLORS.primary)}
              {renderSection('Factual Evidence Needed', '📁', report.evidenceNeeded, COLORS.success)}
              {renderSection('Urgent Immediate Tasks', '🚨', report.urgentItems, COLORS.error)}

              <TouchableOpacity style={styles.reScanBtn} onPress={handleRunScan}>
                <Text style={styles.reScanBtnText}>Re-Build Questionnaire</Text>
              </TouchableOpacity>
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
  summaryTitle: {
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs
  },
  summaryDesc: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    lineHeight: 20
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
    alignItems: 'center',
    marginBottom: SPACING.sm
  },
  numberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md
  },
  numberText: {
    fontSize: FONTS.small,
    fontWeight: 'bold'
  },
  itemText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18
  },
  reScanBtn: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center'
  },
  reScanBtnText: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary
  }
});

export default ClientQuestionsScreen;
