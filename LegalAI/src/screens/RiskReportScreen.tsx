/*
 * RiskReportScreen.tsx — Legal Audit: Risk + Evidence analysis screen.
 *
 * Shows progress during chunk-by-chunk analysis, then renders:
 *   1. Confidence Score banner
 *   2. Risk Cards (High / Medium)
 *   3. Missing Clauses
 *   4. Evidence Analyzer (Strong / Weak / Missing)
 *   5. Recommendations
 *   6. Questions to Ask a Lawyer
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import Header from '../components/Header';
import PerspectiveSelector from '../components/PerspectiveSelector';
import useChatStore from '../store/useChatStore';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import useDocumentStore from '../store/useDocumentStore';
import { isModelReady } from '../services/llmService';
import { analyzeRisk, RiskReport } from '../services/riskAnalyzer';
import { analyzeEvidence, EvidenceReport } from '../services/evidenceAnalyzer';
import { LegalPerspective } from '../types/legalPerspective';
import { CaseType } from '../types/caseType';

type RouteP = RouteProp<RootStackParamList, 'RiskReport'>;
type NavP = NativeStackNavigationProp<RootStackParamList, 'RiskReport'>;

const RiskReportScreen: React.FC = () => {
  const navigation = useNavigation<NavP>();
  const route = useRoute<RouteP>();
  const { docId, docName } = route.params;
  const getDocumentById = useDocumentStore(s => s.getDocumentById);
  const document = getDocumentById(docId);

  const perspective = useChatStore(s => s.selectedPerspective);
  const caseType = useChatStore(s => s.selectedCaseType);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal, setProgressTotal] = useState(0);
  const [riskReport, setRiskReport] = useState<RiskReport | null>(null);
  const [evidenceReport, setEvidenceReport] = useState<EvidenceReport | null>(null);
  const [activeSection, setActiveSection] = useState<'risk' | 'evidence' | 'questions'>('risk');

  const handleAnalyze = async () => {
    if (!isModelReady()) {
      Alert.alert('Model Not Loaded', 'Please load the AI model in Settings first.');
      return;
    }
    if (!document?.chunks?.length) {
      Alert.alert('No Text', 'Document text has not been extracted yet. Open the document first.');
      return;
    }
    setIsAnalyzing(true);
    setRiskReport(null);
    setEvidenceReport(null);
    setProgressCurrent(0);
    setProgressTotal(document.chunks.length);
    try {
      const risk = await analyzeRisk(
        document.chunks,
        perspective,
        caseType,
        (text, cur, tot) => {
          setProgressText(text);
          setProgressCurrent(cur);
          setProgressTotal(tot);
        }
      );
      setProgressText('Analyzing evidence...');
      const evidence = await analyzeEvidence(
        document.chunks,
        perspective,
        caseType,
        (text) => setProgressText(text)
      );
      setRiskReport(risk);
      setEvidenceReport(evidence);
    } catch (err: any) {
      Alert.alert('Analysis Failed', err?.message || 'Unknown error during analysis.');
    } finally {
      setIsAnalyzing(false);
      setProgressText('');
    }
  };

  const confidenceColor = (score: number) =>
    score >= 75 ? COLORS.success : score >= 50 ? COLORS.warning : COLORS.error;

  const copyQuestion = (q: string) => {
    Clipboard.setString(q);
    Alert.alert('Copied', 'Question copied to clipboard.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Legal Audit"
        subtitle={docName}
        showBack
        onBackPress={() => navigation.goBack()}
      />
      <PerspectiveSelector compact={true} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ─── RUN LEGAL AUDIT BUTTON ─── */}
        <View style={styles.card}>
          <Text style={styles.selectorLabel}>Run diagnostic legal audit under selected role and case type guidelines.</Text>
          <TouchableOpacity
            style={[styles.analyzeBtn, isAnalyzing && styles.btnDisabled, { marginTop: SPACING.md }]}
            onPress={handleAnalyze}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <ActivityIndicator size="small" color={COLORS.background} />
            ) : (
              <Text style={styles.analyzeBtnText}>⚖️ Run Legal Audit</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ─── PROGRESS ─── */}
        {isAnalyzing && (
          <View style={styles.card}>
            <Text style={styles.progressTitle}>{progressText || 'Starting analysis...'}</Text>
            {progressTotal > 0 && (
              <>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, {
                    width: `${Math.round((progressCurrent / progressTotal) * 100)}%` as any
                  }]} />
                </View>
                <Text style={styles.progressSubtext}>
                  {progressCurrent} / {progressTotal} sections
                </Text>
              </>
            )}
          </View>
        )}

        {/* ─── RESULTS ─── */}
        {(riskReport || evidenceReport) && (
          <>
            {/* Confidence Banner */}
            {riskReport && (
              <View style={[styles.confidenceBanner, { borderColor: confidenceColor(riskReport.confidence) }]}>
                <View style={styles.confidenceLeft}>
                  <Text style={[styles.confidenceScore, { color: confidenceColor(riskReport.confidence) }]}>
                    {riskReport.confidence}%
                  </Text>
                  <Text style={styles.confidenceLabel}>Analysis Confidence</Text>
                </View>
                <Text style={styles.confidenceReason}>{riskReport.confidenceReason}</Text>
              </View>
            )}

            {/* Section Tabs */}
            <View style={styles.tabBar}>
              {(['risk', 'evidence', 'questions'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabBtn, activeSection === tab && styles.tabBtnActive]}
                  onPress={() => setActiveSection(tab)}
                >
                  <Text style={[styles.tabBtnText, activeSection === tab && styles.tabBtnTextActive]}>
                    {tab === 'risk' ? '⚠️ Risk' : tab === 'evidence' ? '🔎 Evidence' : '💬 Questions'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ─── RISK TAB ─── */}
            {activeSection === 'risk' && riskReport && (
              <View>
                {riskReport.highRisk.length === 0 && riskReport.mediumRisk.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyIcon}>✅</Text>
                    <Text style={styles.emptyText}>No high or medium risk clauses found.</Text>
                  </View>
                ) : null}

                {riskReport.highRisk.map((item, i) => (
                  <View key={`h${i}`} style={[styles.riskCard, styles.riskHigh]}>
                    <View style={styles.riskHeader}>
                      <Text style={styles.riskBadgeHigh}>HIGH RISK</Text>
                      <Text style={styles.riskChunk}>§ Section {item.chunkIndex + 1}</Text>
                    </View>
                    <Text style={styles.riskClause}>"{item.clause}"</Text>
                    <Text style={styles.riskExplanation}>{item.explanation}</Text>
                  </View>
                ))}

                {riskReport.mediumRisk.map((item, i) => (
                  <View key={`m${i}`} style={[styles.riskCard, styles.riskMedium]}>
                    <View style={styles.riskHeader}>
                      <Text style={styles.riskBadgeMedium}>MEDIUM RISK</Text>
                      <Text style={styles.riskChunk}>§ Section {item.chunkIndex + 1}</Text>
                    </View>
                    <Text style={styles.riskClause}>"{item.clause}"</Text>
                    <Text style={styles.riskExplanation}>{item.explanation}</Text>
                  </View>
                ))}

                {riskReport.missing.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>📋 Missing Provisions</Text>
                    {riskReport.missing.map((m, i) => (
                      <View key={i} style={styles.missingRow}>
                        <Text style={styles.missingDot}>❌</Text>
                        <Text style={styles.missingText}>{m}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {riskReport.recommendations.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>💡 Recommendations</Text>
                    {riskReport.recommendations.map((r, i) => (
                      <View key={i} style={styles.recRow}>
                        <Text style={styles.recNumber}>{i + 1}.</Text>
                        <Text style={styles.recText}>{r}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ─── EVIDENCE TAB ─── */}
            {activeSection === 'evidence' && evidenceReport && (
              <View>
                <View style={[styles.confidenceBanner, { borderColor: confidenceColor(evidenceReport.confidence) }]}>
                  <View style={styles.confidenceLeft}>
                    <Text style={[styles.confidenceScore, { color: confidenceColor(evidenceReport.confidence) }]}>
                      {evidenceReport.confidence}%
                    </Text>
                    <Text style={styles.confidenceLabel}>Evidence Confidence</Text>
                  </View>
                  <Text style={styles.confidenceReason}>{evidenceReport.confidenceReason}</Text>
                </View>

                {evidenceReport.strongEvidence.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>✅ Strong Evidence</Text>
                    {evidenceReport.strongEvidence.map((e, i) => (
                      <View key={i} style={styles.evidenceRow}>
                        <Text style={styles.evidenceIcon}>✅</Text>
                        <View style={styles.evidenceContent}>
                          <Text style={styles.evidenceItem}>{e.item}</Text>
                          {e.reference ? <Text style={styles.evidenceRef}>{e.reference}</Text> : null}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {evidenceReport.weakEvidence.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>⚠️ Weak Evidence</Text>
                    {evidenceReport.weakEvidence.map((e, i) => (
                      <View key={i} style={styles.evidenceRow}>
                        <Text style={styles.evidenceIcon}>⚠️</Text>
                        <View style={styles.evidenceContent}>
                          <Text style={styles.evidenceItem}>{e.item}</Text>
                          {e.reference ? <Text style={styles.evidenceRef}>{e.reference}</Text> : null}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {evidenceReport.missingEvidence.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>❌ Missing Evidence</Text>
                    {evidenceReport.missingEvidence.map((m, i) => (
                      <View key={i} style={styles.missingRow}>
                        <Text style={styles.missingDot}>❌</Text>
                        <Text style={styles.missingText}>{m}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {evidenceReport.strongEvidence.length === 0 &&
                  evidenceReport.weakEvidence.length === 0 &&
                  evidenceReport.missingEvidence.length === 0 && (
                    <View style={styles.emptyCard}>
                      <Text style={styles.emptyIcon}>📄</Text>
                      <Text style={styles.emptyText}>No specific evidence references found in this document.</Text>
                    </View>
                  )}
              </View>
            )}

            {/* ─── QUESTIONS TAB ─── */}
            {activeSection === 'questions' && riskReport && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>💬 Questions to Ask Your Lawyer</Text>
                <Text style={styles.questionsSubtitle}>
                  Tap any question to copy it to your clipboard before your consultation.
                </Text>
                {riskReport.lawyerQuestions.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.questionCard}
                    onPress={() => copyQuestion(q)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.questionNumber}>{i + 1}</Text>
                    <Text style={styles.questionText}>{q}</Text>
                    <Text style={styles.copyHint}>📋</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* ─── EMPTY STATE ─── */}
        {!riskReport && !isAnalyzing && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>⚖️</Text>
            <Text style={styles.emptyTitle}>Legal Audit</Text>
            <Text style={styles.emptyText}>
              Select your perspective and case type above, then tap "Run Legal Audit" to analyze this document for risks, evidence quality, and recommended consultation questions.
            </Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  selectorLabel: {
    fontSize: FONTS.caption, fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary, marginBottom: SPACING.sm,
  },
  chipRow: { flexDirection: 'row', marginBottom: SPACING.xs },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border,
    marginRight: SPACING.sm, backgroundColor: COLORS.surfaceVariant,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONTS.caption, color: COLORS.textSecondary, fontWeight: FONTS.weightSemiBold },
  chipTextActive: { color: COLORS.background },
  analyzeBtn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: SPACING.md, alignItems: 'center', marginTop: SPACING.md,
  },
  btnDisabled: { opacity: 0.5 },
  analyzeBtnText: { fontSize: FONTS.body, fontWeight: FONTS.weightBold, color: COLORS.background },
  progressTitle: { fontSize: FONTS.body, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  progressBarBg: {
    height: 6, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden',
  },
  progressBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.full },
  progressSubtext: { fontSize: FONTS.caption, color: COLORS.textSecondary, marginTop: SPACING.xs, textAlign: 'center' },
  confidenceBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 2, gap: SPACING.md,
  },
  confidenceLeft: { alignItems: 'center', minWidth: 64 },
  confidenceScore: { fontSize: 32, fontWeight: FONTS.weightBold },
  confidenceLabel: { fontSize: FONTS.caption, color: COLORS.textSecondary, marginTop: 2 },
  confidenceReason: { flex: 1, fontSize: FONTS.caption, color: COLORS.textSecondary, lineHeight: 18 },
  tabBar: { flexDirection: 'row', marginBottom: SPACING.md, gap: SPACING.sm },
  tabBtn: {
    flex: 1, paddingVertical: SPACING.sm, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: COLORS.border,
  },
  tabBtnActive: { borderBottomColor: COLORS.primary },
  tabBtnText: { fontSize: FONTS.caption, fontWeight: FONTS.weightSemiBold, color: COLORS.textSecondary },
  tabBtnTextActive: { color: COLORS.primary },
  riskCard: {
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    borderLeftWidth: 4,
  },
  riskHigh: { backgroundColor: 'rgba(252,129,129,0.08)', borderLeftColor: COLORS.error },
  riskMedium: { backgroundColor: 'rgba(246,173,85,0.08)', borderLeftColor: COLORS.warning },
  riskHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  riskBadgeHigh: { fontSize: FONTS.small, fontWeight: FONTS.weightBold, color: COLORS.error },
  riskBadgeMedium: { fontSize: FONTS.small, fontWeight: FONTS.weightBold, color: COLORS.warning },
  riskChunk: { fontSize: FONTS.small, color: COLORS.textMuted },
  riskClause: { fontSize: FONTS.caption, fontStyle: 'italic', color: COLORS.textPrimary, marginBottom: SPACING.xs },
  riskExplanation: { fontSize: FONTS.caption, color: COLORS.textSecondary, lineHeight: 18 },
  sectionTitle: {
    fontSize: FONTS.body, fontWeight: FONTS.weightBold, color: COLORS.primary, marginBottom: SPACING.md,
  },
  missingRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  missingDot: { fontSize: FONTS.body, marginRight: SPACING.sm },
  missingText: { flex: 1, fontSize: FONTS.caption, color: COLORS.textSecondary, lineHeight: 18 },
  recRow: { flexDirection: 'row', marginBottom: SPACING.sm },
  recNumber: { fontSize: FONTS.caption, fontWeight: FONTS.weightBold, color: COLORS.primary, marginRight: SPACING.sm, minWidth: 18 },
  recText: { flex: 1, fontSize: FONTS.caption, color: COLORS.textSecondary, lineHeight: 18 },
  evidenceRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  evidenceIcon: { fontSize: FONTS.body, marginRight: SPACING.sm },
  evidenceContent: { flex: 1 },
  evidenceItem: { fontSize: FONTS.caption, color: COLORS.textPrimary, lineHeight: 18 },
  evidenceRef: { fontSize: FONTS.small, color: COLORS.textMuted, marginTop: 2 },
  questionsSubtitle: {
    fontSize: FONTS.caption, color: COLORS.textSecondary, marginBottom: SPACING.md, lineHeight: 18,
  },
  questionCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.surfaceVariant, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
  },
  questionNumber: {
    fontSize: FONTS.body, fontWeight: FONTS.weightBold, color: COLORS.primary,
    marginRight: SPACING.sm, minWidth: 24,
  },
  questionText: { flex: 1, fontSize: FONTS.caption, color: COLORS.textPrimary, lineHeight: 20 },
  copyHint: { fontSize: FONTS.body, marginLeft: SPACING.sm },
  emptyCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.xl, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: { fontSize: FONTS.subheading, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  emptyText: { fontSize: FONTS.caption, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
});

export default RiskReportScreen;
