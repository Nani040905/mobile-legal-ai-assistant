/*
 * StrategyScreen.tsx — Legal Strategy Generator Screen.
 *
 * PURPOSE: Allows users to run a perspective-aware strategic analysis on the
 * document, rendering:
 *   1. Confidence score banner
 *   2. Strengths & Weaknesses (Tab 1)
 *   3. Arguments & Evidence Needed (Tab 2)
 *   4. Actions & Lawyer Questions (Tab 3)
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Clipboard } from
'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';


import Header from '../components/Header';
import PerspectiveSelector from '../components/PerspectiveSelector';
import useChatStore from '../store/useChatStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import useDocumentStore from '../store/useDocumentStore';
import { isModelReady } from '../services/llmService';
import { generateStrategy } from '../services/strategyGenerator';




const StrategyScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { docId, docName } = route.params;
  const getDocumentById = useDocumentStore((s) => s.getDocumentById);
  const document = getDocumentById(docId);

  const perspective = useChatStore((s) => s.selectedPerspective);
  const caseType = useChatStore((s) => s.selectedCaseType);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [strategy, setStrategy] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handleGenerate = async () => {
    if (!isModelReady()) {
      Alert.alert('Model Not Loaded', 'Please load the AI model in Settings first.');
      return;
    }
    if (!document?.chunks?.length) {
      Alert.alert('No Text', 'Document text has not been extracted yet. Open the document first.');
      return;
    }
    setIsAnalyzing(true);
    setStrategy(null);
    setProgressCurrent(0);
    setProgressTotal(document.chunks.length);

    try {
      const report = await generateStrategy(
        document.chunks,
        perspective,
        caseType,
        (text, cur, tot) => {
          setProgressText(text);
          setProgressCurrent(cur);
          setProgressTotal(tot);
        }
      );
      setStrategy(report);
    } catch (err) {
      Alert.alert('Analysis Failed', err?.message || 'Unknown error during strategy formulation.');
    } finally {
      setIsAnalyzing(false);
      setProgressText('');
    }
  };

  const confidenceColor = (score) =>
  score >= 75 ? COLORS.success : score >= 50 ? COLORS.warning : COLORS.error;

  const copyItem = (text, label) => {
    Clipboard.setString(text);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Legal Strategy"
        subtitle={docName}
        showBack
        onBackPress={() => navigation.goBack()} />
      
      <PerspectiveSelector compact={true} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ─── RUN ACTION CARD ─── */}
        <View style={styles.card}>
          <Text style={styles.selectorLabel}>Generate tactical SWOT, legal arguments, and custom attorney consult questions.</Text>
          <TouchableOpacity
            style={[styles.analyzeBtn, isAnalyzing && styles.btnDisabled, { marginTop: SPACING.md }]}
            onPress={handleGenerate}
            disabled={isAnalyzing}>
            
            {isAnalyzing ?
            <ActivityIndicator size="small" color={COLORS.background} /> :

            <Text style={styles.analyzeBtnText}>⚡ Generate Strategy</Text>
            }
          </TouchableOpacity>
        </View>

        {/* ─── PROGRESS BAR ─── */}
        {isAnalyzing &&
        <View style={styles.card}>
            <Text style={styles.progressTitle}>{progressText || 'Preparing engine...'}</Text>
            {progressTotal > 0 &&
          <>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, {
                width: `${Math.round(progressCurrent / progressTotal * 100)}%`
              }]} />
                </View>
                <Text style={styles.progressSubtext}>
                  {progressCurrent} / {progressTotal} sections
                </Text>
              </>
          }
          </View>
        }

        {/* ─── STRATEGY RESULTS ─── */}
        {strategy &&
        <>
            {/* Confidence Banner */}
            <View style={[styles.confidenceBanner, { borderColor: confidenceColor(strategy.confidence) }]}>
              <View style={styles.confidenceLeft}>
                <Text style={[styles.confidenceScore, { color: confidenceColor(strategy.confidence) }]}>
                  {strategy.confidence}%
                </Text>
                <Text style={styles.confidenceLabel}>Strategy Confidence</Text>
              </View>
              <Text style={styles.confidenceReason}>{strategy.confidenceReason}</Text>
            </View>

            {/* Segment Tab Controls */}
            <View style={styles.tabBar}>
              {['overview', 'arguments', 'questions'].map((tab) =>
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab)}>
              
                  <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
                    {tab === 'overview' ? '⚡ SWOT' : tab === 'arguments' ? '⚖️ Claims' : '💬 Questions'}
                  </Text>
                </TouchableOpacity>
            )}
            </View>

            {/* ─── TAB 1: SWOT OVERVIEW ─── */}
            {activeTab === 'overview' &&
          <View>
                {/* Strengths */}
                <View style={styles.card}>
                  <Text style={[styles.sectionTitle, { color: COLORS.success }]}>💪 Strengths</Text>
                  {strategy.strengths.length === 0 ?
              <Text style={styles.emptyText}>No explicit strengths detected.</Text> :

              strategy.strengths.map((item, i) =>
              <View key={i} style={styles.bulletRow}>
                        <Text style={[styles.bulletDot, { color: COLORS.success }]}>●</Text>
                        <Text style={styles.bulletText}>{item}</Text>
                      </View>
              )
              }
                </View>

                {/* Weaknesses */}
                <View style={styles.card}>
                  <Text style={[styles.sectionTitle, { color: COLORS.error }]}>⚠️ Weaknesses / Exposure</Text>
                  {strategy.weaknesses.length === 0 ?
              <Text style={styles.emptyText}>No explicit weaknesses or loopholes detected.</Text> :

              strategy.weaknesses.map((item, i) =>
              <View key={i} style={styles.bulletRow}>
                        <Text style={[styles.bulletDot, { color: COLORS.error }]}>●</Text>
                        <Text style={styles.bulletText}>{item}</Text>
                      </View>
              )
              }
                </View>
              </View>
          }

            {/* ─── TAB 2: CLAIMS & EVIDENCE ─── */}
            {activeTab === 'arguments' &&
          <View>
                {/* Possible Arguments */}
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>⚖️ Favorable Arguments</Text>
                  {strategy.possibleArguments.length === 0 ?
              <Text style={styles.emptyText}>No specific legal arguments formulated.</Text> :

              strategy.possibleArguments.map((item, i) =>
              <View key={i} style={styles.bulletRow}>
                        <Text style={styles.bulletDot}>●</Text>
                        <Text style={styles.bulletText}>{item}</Text>
                      </View>
              )
              }
                </View>

                {/* Evidence Needed */}
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>📂 Supporting Evidence Required</Text>
                  {strategy.evidenceNeeded.length === 0 ?
              <Text style={styles.emptyText}>No evidence requirements specified.</Text> :

              strategy.evidenceNeeded.map((item, i) =>
              <View key={i} style={styles.bulletRow}>
                        <Text style={styles.bulletDot}>●</Text>
                        <Text style={styles.bulletText}>{item}</Text>
                      </View>
              )
              }
                </View>
              </View>
          }

            {/* ─── TAB 3: ACTIONS & LAWYER QUESTIONS ─── */}
            {activeTab === 'questions' &&
          <View>
                {/* Recommended Actions */}
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>📋 Recommended Next Steps</Text>
                  {strategy.recommendedActions.length === 0 ?
              <Text style={styles.emptyText}>No specific action items listed.</Text> :

              strategy.recommendedActions.map((item, i) =>
              <View key={i} style={styles.bulletRow}>
                        <Text style={styles.bulletNumber}>{i + 1}.</Text>
                        <Text style={styles.bulletText}>{item}</Text>
                      </View>
              )
              }
                </View>

                {/* Questions to Ask a Lawyer */}
                <Text style={styles.subHeadingLabel}>Questions to Discuss With a Lawyer</Text>
                {strategy.lawyerQuestions.length === 0 ?
            <View style={styles.card}>
                    <Text style={styles.emptyText}>No custom consultation questions generated.</Text>
                  </View> :

            strategy.lawyerQuestions.map((q, i) =>
            <TouchableOpacity
              key={i}
              style={styles.questionCard}
              onPress={() => copyItem(q, 'Question')}
              activeOpacity={0.7}>
              
                      <View style={styles.questionHeader}>
                        <Text style={styles.questionNum}>Question {i + 1}</Text>
                        <Text style={styles.copyBadge}>📋 Copy</Text>
                      </View>
                      <Text style={styles.questionText}>{q}</Text>
                    </TouchableOpacity>
            )
            }
              </View>
          }
          </>
        }
      </ScrollView>
    </SafeAreaView>);

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scroll: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md
  },
  selectorLabel: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    lineHeight: 18
  },
  analyzeBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnDisabled: {
    opacity: 0.6
  },
  analyzeBtnText: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    color: COLORS.background
  },
  progressTitle: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    marginVertical: SPACING.sm
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary
  },
  progressSubtext: {
    fontSize: FONTS.caption,
    color: COLORS.textMuted,
    textAlign: 'right'
  },
  confidenceBanner: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    flexDirection: 'column'
  },
  confidenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm
  },
  confidenceScore: {
    fontSize: 28,
    fontWeight: FONTS.weightBold,
    marginRight: SPACING.md
  },
  confidenceLabel: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary
  },
  confidenceReason: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    lineHeight: 18
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md
  },
  tabBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.sm
  },
  tabBtnActive: {
    backgroundColor: COLORS.border
  },
  tabBtnText: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary
  },
  tabBtnTextActive: {
    color: COLORS.primary
  },
  sectionTitle: {
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md
  },
  emptyText: {
    fontSize: FONTS.caption,
    color: COLORS.textMuted,
    fontStyle: 'italic'
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm
  },
  bulletDot: {
    fontSize: 16,
    color: COLORS.primary,
    marginRight: SPACING.sm,
    marginTop: -2
  },
  bulletNumber: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
    marginRight: SPACING.sm,
    width: 20
  },
  bulletText: {
    flex: 1,
    fontSize: FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 20
  },
  subHeadingLabel: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.xs,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm
  },
  questionCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs
  },
  questionNum: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary
  },
  copyBadge: {
    fontSize: FONTS.caption,
    color: COLORS.textMuted
  },
  questionText: {
    fontSize: FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 20
  }
});

export default StrategyScreen;