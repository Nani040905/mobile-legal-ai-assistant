/*
 * PerspectiveComparisonScreen.tsx — Multi-Perspective Comparison.
 *
 * PURPOSE: Renders side-by-side comparative analysis of a document from two
 * perspectives. Shows claim, evidence, risk, and confidence metrics for both sides.
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Clipboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import Header from '../components/Header';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import useDocumentStore from '../store/useDocumentStore';
import { isModelReady } from '../services/llmService';
import { comparePerspectives, ComparisonMatrix } from '../services/perspectiveComparison';
import { LegalPerspective, PERSPECTIVE_LABELS } from '../types/legalPerspective';
import { CaseType, CASE_TYPE_LABELS } from '../types/caseType';

type RouteP = RouteProp<RootStackParamList, 'PerspectiveComparison'>;
type NavP = NativeStackNavigationProp<RootStackParamList, 'PerspectiveComparison'>;

const PERSPECTIVES: LegalPerspective[] = [
  'neutral', 'plaintiff', 'defendant', 'complainant', 'accused',
  'petitioner', 'respondent', 'employee', 'employer', 'tenant', 'landlord', 'consumer', 'business'
];

const CASE_TYPES: CaseType[] = [
  'unknown', 'criminal', 'civil', 'consumer', 'employment',
  'property', 'family', 'contract', 'tax', 'constitutional'
];

const PerspectiveComparisonScreen: React.FC = () => {
  const navigation = useNavigation<NavP>();
  const route = useRoute<RouteP>();
  const { docId, docName } = route.params;
  const getDocumentById = useDocumentStore(s => s.getDocumentById);
  const document = getDocumentById(docId);

  // Selector states
  const [perspectiveA, setPerspectiveA] = useState<LegalPerspective>('plaintiff');
  const [perspectiveB, setPerspectiveB] = useState<LegalPerspective>('defendant');
  const [caseType, setCaseType] = useState<CaseType>('unknown');

  // Loading/Inference states
  const [isComparing, setIsComparing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [matrix, setMatrix] = useState<ComparisonMatrix | null>(null);

  const handleCompare = async () => {
    if (!isModelReady()) {
      Alert.alert('Model Not Loaded', 'Please load the AI model in Settings first.');
      return;
    }
    if (!document?.chunks?.length) {
      Alert.alert('No Text', 'Document text has not been extracted yet. Open the document first.');
      return;
    }
    if (perspectiveA === perspectiveB) {
      Alert.alert('Same Perspectives', 'Please select two different perspectives to compare.');
      return;
    }

    setIsComparing(true);
    setMatrix(null);
    setStatusText('Preparing comparison context...');

    try {
      const result = await comparePerspectives(
        document.chunks,
        perspectiveA,
        perspectiveB,
        caseType,
        (status) => setStatusText(status)
      );
      setMatrix(result);
    } catch (e: any) {
      Alert.alert('Comparison Failed', e?.message || 'Error occurred during comparative analysis.');
    } finally {
      setIsComparing(false);
      setStatusText('');
    }
  };

  const copyItem = (text: string, label: string) => {
    Clipboard.setString(text);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  const riskColor = (level: 'LOW' | 'MEDIUM' | 'HIGH') => {
    if (level === 'LOW') return COLORS.success;
    if (level === 'MEDIUM') return COLORS.warning;
    return COLORS.error;
  };

  const confidenceColor = (score: number) =>
    score >= 75 ? COLORS.success : score >= 50 ? COLORS.warning : COLORS.error;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Perspective Comparison"
        subtitle={docName}
        showBack
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ─── SELECTORS CARD ─── */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Configure Comparative Analysis</Text>

          {/* Perspective A Selection */}
          <Text style={styles.selectorLabel}>Side A Perspective</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
            {PERSPECTIVES.map(p => (
              <TouchableOpacity
                key={`a-${p}`}
                style={[styles.chip, perspectiveA === p && styles.chipActiveA]}
                onPress={() => setPerspectiveA(p)}
              >
                <Text style={[styles.chipText, perspectiveA === p && styles.chipTextActive]}>
                  {PERSPECTIVE_LABELS[p]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Perspective B Selection */}
          <Text style={[styles.selectorLabel, { marginTop: SPACING.sm }]}>Side B Perspective</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
            {PERSPECTIVES.map(p => (
              <TouchableOpacity
                key={`b-${p}`}
                style={[styles.chip, perspectiveB === p && styles.chipActiveB]}
                onPress={() => setPerspectiveB(p)}
              >
                <Text style={[styles.chipText, perspectiveB === p && styles.chipTextActive]}>
                  {PERSPECTIVE_LABELS[p]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Case Type Selection */}
          <Text style={[styles.selectorLabel, { marginTop: SPACING.sm }]}>Case Type Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
            {CASE_TYPES.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, caseType === c && styles.chipActiveType]}
                onPress={() => setCaseType(c)}
              >
                <Text style={[styles.chipText, caseType === c && styles.chipTextActive]}>
                  {CASE_TYPE_LABELS[c]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Compare Button */}
          <TouchableOpacity
            style={[styles.compareBtn, isComparing && styles.btnDisabled]}
            onPress={handleCompare}
            disabled={isComparing}
          >
            {isComparing ? (
              <ActivityIndicator size="small" color={COLORS.background} />
            ) : (
              <Text style={styles.compareBtnText}>🆚 Compare Angles</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ─── LOADING INDICATOR ─── */}
        {isComparing && (
          <View style={styles.card}>
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginBottom: SPACING.md }} />
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        )}

        {/* ─── COMPARISON MATRIX ─── */}
        {matrix && (
          <View>
            <Text style={styles.sectionHeading}>Comparison Matrix</Text>

            {/* Side-by-Side Claims Grid */}
            <View style={styles.gridRow}>
              {/* Perspective A Box */}
              <View style={[styles.gridCol, styles.gridColLeft]}>
                <Text style={styles.colTitle}>{PERSPECTIVE_LABELS[matrix.perspectiveA.perspective].toUpperCase()}</Text>
                
                <View style={styles.matrixSection}>
                  <Text style={styles.sectionLabel}>Strongest Claim / Angle</Text>
                  <Text style={styles.matrixText}>{matrix.perspectiveA.strongestClaim}</Text>
                </View>

                <View style={styles.matrixSection}>
                  <Text style={styles.sectionLabel}>Key Evidence Section</Text>
                  <Text style={styles.matrixText}>{matrix.perspectiveA.keyEvidence}</Text>
                </View>

                <View style={styles.matrixRow}>
                  <Text style={styles.sectionLabel}>Legal Risk: </Text>
                  <Text style={[styles.badge, { backgroundColor: riskColor(matrix.perspectiveA.legalRisk) }]}>
                    {matrix.perspectiveA.legalRisk}
                  </Text>
                </View>

                <View style={styles.matrixRow}>
                  <Text style={styles.sectionLabel}>Confidence: </Text>
                  <Text style={[styles.confidenceNum, { color: confidenceColor(matrix.perspectiveA.confidence) }]}>
                    {matrix.perspectiveA.confidence}%
                  </Text>
                </View>
              </View>

              {/* Divider line */}
              <View style={styles.gridDivider} />

              {/* Perspective B Box */}
              <View style={styles.gridCol}>
                <Text style={styles.colTitle}>{PERSPECTIVE_LABELS[matrix.perspectiveB.perspective].toUpperCase()}</Text>

                <View style={styles.matrixSection}>
                  <Text style={styles.sectionLabel}>Strongest Claim / Angle</Text>
                  <Text style={styles.matrixText}>{matrix.perspectiveB.strongestClaim}</Text>
                </View>

                <View style={styles.matrixSection}>
                  <Text style={styles.sectionLabel}>Key Evidence Section</Text>
                  <Text style={styles.matrixText}>{matrix.perspectiveB.keyEvidence}</Text>
                </View>

                <View style={styles.matrixRow}>
                  <Text style={styles.sectionLabel}>Legal Risk: </Text>
                  <Text style={[styles.badge, { backgroundColor: riskColor(matrix.perspectiveB.legalRisk) }]}>
                    {matrix.perspectiveB.legalRisk}
                  </Text>
                </View>

                <View style={styles.matrixRow}>
                  <Text style={styles.sectionLabel}>Confidence: </Text>
                  <Text style={[styles.confidenceNum, { color: confidenceColor(matrix.perspectiveB.confidence) }]}>
                    {matrix.perspectiveB.confidence}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Shared Lawyer Questions */}
            <Text style={styles.sectionHeading}>Shared Questions to Ask a Lawyer</Text>
            {matrix.sharedLawyerQuestions.map((q, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.questionCard}
                onPress={() => copyItem(q, 'Question')}
                activeOpacity={0.7}
              >
                <View style={styles.questionHeader}>
                  <Text style={styles.questionNum}>Question {idx + 1}</Text>
                  <Text style={styles.copyBadge}>📋 Copy</Text>
                </View>
                <Text style={styles.questionText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  card: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  cardHeader: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  selectorLabel: {
    fontSize: FONTS.small,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  selectorScroll: {
    paddingBottom: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.xs,
  },
  chipActiveA: {
    backgroundColor: '#3182CE', // Strong blue accent for Side A
    borderColor: '#3182CE',
  },
  chipActiveB: {
    backgroundColor: '#DD6B20', // Orange accent for Side B
    borderColor: '#DD6B20',
  },
  chipActiveType: {
    backgroundColor: COLORS.primary, // Gold for case type
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.background,
  },
  compareBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  compareBtnText: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    color: COLORS.background,
  },
  statusText: {
    fontSize: FONTS.caption,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  sectionHeading: {
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginVertical: SPACING.md,
  },
  gridRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  gridCol: {
    flex: 1,
  },
  gridColLeft: {
    paddingRight: SPACING.md,
  },
  gridDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.xs,
  },
  colTitle: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  matrixSection: {
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: FONTS.small,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weightSemiBold,
    marginBottom: 2,
  },
  matrixText: {
    fontSize: FONTS.caption,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  matrixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  badge: {
    fontSize: FONTS.small,
    fontWeight: FONTS.weightBold,
    color: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  confidenceNum: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
  },
  questionCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  questionNum: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
  },
  copyBadge: {
    fontSize: FONTS.caption,
    color: COLORS.textMuted,
  },
  questionText: {
    fontSize: FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
});

export default PerspectiveComparisonScreen;
