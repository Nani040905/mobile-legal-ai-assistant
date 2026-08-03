import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import useCaseStore from '../store/useCaseStore';
import useDocumentStore from '../store/useDocumentStore';
import { buildEvidenceChain } from '../services/evidenceChainTracker';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

const EvidenceChainScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { caseId, caseTitle } = route.params;

  const caseObj = useCaseStore((state) => state.getCaseById(caseId));
  const setEvidenceChainReport = useCaseStore((state) => state.setEvidenceChainReport);
  const allDocs = useDocumentStore((state) => state.documents);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (caseObj?.evidenceChainReport) {
      setReport(caseObj.evidenceChainReport);
    }
  }, [caseObj?.evidenceChainReport]);

  const handleRunScan = async () => {
    if (!caseObj || !caseObj.documents || caseObj.documents.length === 0) {
      Alert.alert(
        'No Documents Linked',
        'Please link at least one document to this case folder before scanning for evidence chains.'
      );
      return;
    }

    const linkedDocs = allDocs.filter((d) => caseObj.documents.includes(d.id));
    const validDocs = linkedDocs.filter((d) => d.chunks && d.chunks.length > 0);

    if (validDocs.length === 0) {
      Alert.alert(
        'Insufficient Text Chunks',
        'Your linked documents must have extracted text/chunks. Please wait for document processing to finish or upload text-extractable PDFs.'
      );
      return;
    }

    setIsAnalyzing(true);
    setProgressText('Initializing evidence chain tracker...');
    setProgressPercent(0);
    setReport(null);

    try {
      const result = await buildEvidenceChain(caseId, (text, current, total) => {
        setProgressText(text);
        setProgressPercent(total > 0 ? (current / total) * 100 : 0);
      });

      setReport(result);
      setEvidenceChainReport(caseId, result);
    } catch (e) {
      Alert.alert('Scan Error', e.message || 'An error occurred during evidence mapping.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'STRONG':
        return COLORS.success;
      case 'WEAK':
        return COLORS.warning;
      case 'MISSING':
        return COLORS.error;
      default:
        return COLORS.textSecondary;
    }
  };

  const renderFactItem = ({ item }) => {
    const statusColor = getStatusColor(item.status);

    return (
      <View style={styles.factCard}>
        <View style={styles.factHeader}>
          <Text style={styles.factText}>{item.fact}</Text>
          <View style={[styles.statusBadge, { borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={[styles.bullet, { color: COLORS.success }]}>✓</Text>
            <View style={styles.detailTextCol}>
              <Text style={styles.detailTitle}>Supporting Evidence</Text>
              <Text style={styles.detailContent}>{item.supportingEvidence}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.bullet, { color: COLORS.error }]}>✗</Text>
            <View style={styles.detailTextCol}>
              <Text style={styles.detailTitle}>Missing Evidence Needed</Text>
              <Text style={styles.detailContent}>{item.missingEvidence}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.docBadge}>
            <Text style={styles.docBadgeText} numberOfLines={1}>{item.docSource}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Evidence Chain 🔗"
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
            Scanning case documents to identify key factual assertions and link them to supporting evidence...
          </Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {!report ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔗</Text>
              <Text style={styles.emptyTitle}>Evidence Chain Tracker</Text>
              <Text style={styles.emptyDesc}>
                Identify and map key factual statements in your case documents, checking which claims are well-supported (✓) by physical or documentary evidence versus which parts are weak (✗) or require additional verification.
              </Text>
              <TouchableOpacity style={styles.actionBtn} onPress={handleRunScan}>
                <Text style={styles.actionBtnText}>Map Evidence Chain</Text>
              </TouchableOpacity>
            </View>
          ) : report.items.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyTitle}>No Key Assertions Extracted</Text>
              <Text style={styles.emptyDesc}>
                The scanner completed successfully, but was unable to identify specific legal assertions or facts to cross-reference.
              </Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleRunScan}>
                <Text style={styles.secondaryBtnText}>Run Scan Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={report.items}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderFactItem}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Evidentiary Strength Score</Text>
                    <Text style={styles.summaryValue}>{report.confidence}%</Text>
                  </View>
                  <Text style={styles.summaryDesc}>
                    This index displays the key facts identified across linked case files, highlighting strong proofs versus evidentiary gaps.
                  </Text>
                </View>
              }
              ListFooterComponent={
                <TouchableOpacity style={styles.reScanBtn} onPress={handleRunScan}>
                  <Text style={styles.reScanBtnText}>Re-Scan Evidence Chain</Text>
                </TouchableOpacity>
              }
            />
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
  secondaryBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    alignItems: 'center'
  },
  secondaryBtnText: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary
  },
  listContent: {
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs
  },
  summaryLabel: {
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary
  },
  summaryValue: {
    fontSize: FONTS.heading,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary
  },
  summaryDesc: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    lineHeight: 20
  },
  factCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  factHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md
  },
  factText: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: SPACING.md,
    lineHeight: 22
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm
  },
  statusText: {
    fontSize: FONTS.caption - 2,
    fontWeight: FONTS.weightBold
  },
  detailsContainer: {
    marginBottom: SPACING.md
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm
  },
  bullet: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 20,
    textAlign: 'center',
    marginRight: SPACING.sm
  },
  detailTextCol: {
    flex: 1
  },
  detailTitle: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
    marginBottom: 2
  },
  detailContent: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    lineHeight: 18
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm
  },
  docBadge: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    maxWidth: '80%'
  },
  docBadgeText: {
    fontSize: FONTS.small,
    color: COLORS.primary,
    fontWeight: FONTS.weightSemiBold
  },
  reScanBtn: {
    marginTop: SPACING.md,
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

export default EvidenceChainScreen;
