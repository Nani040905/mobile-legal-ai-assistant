import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import useCaseStore from '../store/useCaseStore';
import useDocumentStore from '../store/useDocumentStore';
import { detectContradictions } from '../services/contradictionDetector';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

const ContradictionScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { caseId, caseTitle } = route.params;

  const caseObj = useCaseStore((state) => state.getCaseById(caseId));
  const setContradictionReport = useCaseStore((state) => state.setContradictionReport);
  const allDocs = useDocumentStore((state) => state.documents);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (caseObj?.contradictionReport) {
      setReport(caseObj.contradictionReport);
    }
  }, [caseObj?.contradictionReport]);

  const handleRunScan = async () => {
    if (!caseObj || caseObj.documents.length < 2) {
      Alert.alert(
        'Insufficient Documents',
        'Please link at least two documents to this case folder before scanning for contradictions.'
      );
      return;
    }

    const linkedDocs = allDocs.filter((d) => caseObj.documents.includes(d.id));
    const validDocs = linkedDocs.filter((d) => d.chunks && d.chunks.length > 0);

    if (validDocs.length < 2) {
      Alert.alert(
        'Insufficient Text Chunks',
        'At least two linked documents must have extracted text/chunks. Please wait for document processing to finish or upload text-extractable PDFs.'
      );
      return;
    }

    setIsAnalyzing(true);
    setProgressText('Initializing scanner...');
    setProgressPercent(0);
    setReport(null);

    try {
      const result = await detectContradictions(validDocs, (text, current, total) => {
        setProgressText(text);
        setProgressPercent(total > 0 ? (current / total) * 100 : 0);
      });

      setReport(result);
      setContradictionReport(caseId, result);
    } catch (e) {
      Alert.alert('Scan Error', e.message || 'An error occurred during contradiction scanning.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'HIGH':
        return '#E53E3E'; // Red
      case 'MEDIUM':
        return '#DD6B20'; // Orange
      case 'LOW':
        return '#718096'; // Gray
      default:
        return COLORS.textSecondary;
    }
  };

  const renderContradictionItem = ({ item }) => {
    const severityColor = getSeverityColor(item.severity);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.topicText}>{item.topic}</Text>
          <View style={[styles.severityBadge, { borderColor: severityColor }]}>
            <Text style={[styles.severityText, { color: severityColor }]}>
              {item.severity}
            </Text>
          </View>
        </View>

        <View style={styles.statementsContainer}>
          <View style={styles.statementRow}>
            <View style={styles.badgeCol}>
              <View style={styles.docBadge}>
                <Text style={styles.docBadgeText} numberOfLines={1}>
                  {item.docSourceA}
                </Text>
              </View>
            </View>
            <View style={styles.textCol}>
              <Text style={styles.statementText}>{item.statementA}</Text>
            </View>
          </View>

          <View style={styles.vsRow}>
            <View style={styles.vsLine} />
            <Text style={styles.vsText}>VS</Text>
            <View style={styles.vsLine} />
          </View>

          <View style={styles.statementRow}>
            <View style={styles.badgeCol}>
              <View style={[styles.docBadge, styles.docBadgeB]}>
                <Text style={styles.docBadgeText} numberOfLines={1}>
                  {item.docSourceB}
                </Text>
              </View>
            </View>
            <View style={styles.textCol}>
              <Text style={styles.statementText}>{item.statementB}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Contradictions ⚠️"
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
            Scanning for factual conflicts, alibi gaps, and date inconsistencies...
          </Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {!report ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>⚠️</Text>
              <Text style={styles.emptyTitle}>Cross-Document Scan</Text>
              <Text style={styles.emptyDesc}>
                Compare all linked documents (FIR, statements, medical reports, deposition notes) to automatically pinpoint factual contradictions, dates mismatch, and conflicting witness testimonies.
              </Text>
              <TouchableOpacity style={styles.actionBtn} onPress={handleRunScan}>
                <Text style={styles.actionBtnText}>Run Cross-Document Scan</Text>
              </TouchableOpacity>
            </View>
          ) : report.contradictions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyTitle}>No Contradictions Found</Text>
              <Text style={styles.emptyDesc}>
                The scanner completed successfully. No major factual conflicts or inconsistencies were detected between the linked files.
              </Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleRunScan}>
                <Text style={styles.secondaryBtnText}>Run Scan Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={report.contradictions}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderContradictionItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={styles.listHeader}>
                  <View>
                    <Text style={styles.listHeaderText}>
                      Detected Inconsistencies ({report.contradictions.length})
                    </Text>
                    <Text style={styles.confidenceTextSummary}>
                      Confidence Score: {report.confidence || 75}%
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.refreshBtn} onPress={handleRunScan}>
                    <Text style={styles.refreshBtnText}>↻ Re-scan</Text>
                  </TouchableOpacity>
                </View>
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
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.body,
    fontWeight: FONTS.weightSemiBold,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  loadingSubtext: {
    color: COLORS.textSecondary,
    fontSize: FONTS.caption,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    marginTop: SPACING.lg,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightBold,
    marginBottom: SPACING.sm,
  },
  emptyDesc: {
    color: COLORS.textSecondary,
    fontSize: FONTS.body,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  actionBtnText: {
    color: COLORS.background,
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
  },
  secondaryBtn: {
    backgroundColor: COLORS.surfaceVariant,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  secondaryBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
  },
  listContent: {
    padding: SPACING.lg,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  listHeaderText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
  },
  confidenceTextSummary: {
    color: COLORS.textSecondary,
    fontSize: FONTS.caption,
    marginTop: 2,
  },
  refreshBtn: {
    padding: SPACING.xs,
  },
  refreshBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.caption,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  topicText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    flex: 1,
    marginRight: SPACING.sm,
  },
  severityBadge: {
    borderWidth: 1,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  severityText: {
    fontSize: FONTS.small - 2,
    fontWeight: FONTS.weightBold,
  },
  statementsContainer: {
    gap: SPACING.xs,
  },
  statementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  badgeCol: {
    width: 90,
  },
  textCol: {
    flex: 1,
  },
  docBadge: {
    backgroundColor: 'rgba(49, 130, 206, 0.12)',
    paddingHorizontal: SPACING.xs,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  docBadgeB: {
    backgroundColor: 'rgba(128, 90, 213, 0.12)',
  },
  docBadgeText: {
    fontSize: FONTS.small - 3,
    fontWeight: FONTS.weightBold,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  statementText: {
    fontSize: FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.xs,
    opacity: 0.5,
  },
  vsLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  vsText: {
    fontSize: FONTS.small - 2,
    fontWeight: FONTS.weightBold,
    color: COLORS.textMuted,
  },
});

export default ContradictionScreen;
