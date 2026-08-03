import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import useCaseStore from '../store/useCaseStore';
import { detectMissingDocuments } from '../services/missingDocDetector';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

const MissingDocsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { caseId, caseTitle } = route.params;

  const caseObj = useCaseStore((state) => state.getCaseById(caseId));
  const setMissingDocsReport = useCaseStore((state) => state.setMissingDocsReport);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [report, setReport] = useState(null);

  useEffect(() => {
    if (caseObj?.missingDocsReport) {
      setReport(caseObj.missingDocsReport);
    }
  }, [caseObj?.missingDocsReport]);

  const handleRunScan = async () => {
    if (!caseObj) {
      Alert.alert('Error', 'Case folder not found.');
      return;
    }

    setIsAnalyzing(true);
    setProgressText('Initializing missing document detector...');
    setProgressPercent(0);
    setReport(null);

    try {
      const result = await detectMissingDocuments(caseId, (text, current, total) => {
        setProgressText(text);
        setProgressPercent(total > 0 ? (current / total) * 100 : 0);
      });

      setReport(result);
      setMissingDocsReport(caseId, result);
    } catch (e) {
      Alert.alert('Scan Error', e.message || 'An error occurred during missing document detection.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderChecklistItem = ({ item }) => {
    return (
      <View style={[styles.itemCard, item.present ? styles.itemCardPresent : styles.itemCardMissing]}>
        <View style={styles.itemHeader}>
          <View style={styles.titleCol}>
            <Text style={styles.itemIcon}>{item.present ? '✅' : '❌'}</Text>
            <Text style={styles.itemType}>{item.type}</Text>
          </View>
          <View style={[styles.requiredBadge, { borderColor: item.required ? COLORS.primary : COLORS.border }]}>
            <Text style={[styles.requiredText, { color: item.required ? COLORS.primary : COLORS.textSecondary }]}>
              {item.required ? 'REQUIRED' : 'OPTIONAL'}
            </Text>
          </View>
        </View>

        {item.present ? (
          <View style={styles.fileMatchContainer}>
            <Text style={styles.matchLabel}>Matched File:</Text>
            <Text style={styles.matchValue} numberOfLines={1}>{item.matchedDocName}</Text>
          </View>
        ) : (
          <View style={styles.fileMatchContainer}>
            <Text style={styles.missingLabel}>Not found in linked case files.</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Missing Docs 📂"
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
            Scanning linked files and classifying content to build your document checklist...
          </Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {!report ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📂</Text>
              <Text style={styles.emptyTitle}>Missing Document Detector</Text>
              <Text style={styles.emptyDesc}>
                Automatically audit your case folder based on checklists customized for your Case Type. The detector scans file names and performs content analysis to confirm what is present versus what is missing (e.g., Charge Sheets, FSL reports).
              </Text>
              <TouchableOpacity style={styles.actionBtn} onPress={handleRunScan}>
                <Text style={styles.actionBtnText}>Audit Case Files</Text>
              </TouchableOpacity>
            </View>
          ) : report.checklist.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✓</Text>
              <Text style={styles.emptyTitle}>No Checklist Generated</Text>
              <Text style={styles.emptyDesc}>
                Unable to generate a document checklist for this case type. Please check if the case folder is configured properly.
              </Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleRunScan}>
                <Text style={styles.secondaryBtnText}>Audit Case Files Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={report.checklist}
              keyExtractor={(item, index) => index.toString()}
              renderItem={renderChecklistItem}
              contentContainerStyle={styles.listContent}
              ListHeaderComponent={
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Audit Result Summary</Text>
                    <Text style={styles.summaryValue}>
                      {report.checklist.filter(c => c.required && c.present).length} / {report.checklist.filter(c => c.required).length} Required
                    </Text>
                  </View>
                  <Text style={styles.summaryDesc}>
                    {report.summary}. Upload missing files to complete your case folder checklist.
                  </Text>
                </View>
              }
              ListFooterComponent={
                <TouchableOpacity style={styles.reScanBtn} onPress={handleRunScan}>
                  <Text style={styles.reScanBtnText}>Re-Run Audit</Text>
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
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary
  },
  summaryDesc: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    lineHeight: 20
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1
  },
  itemCardPresent: {
    borderColor: COLORS.border
  },
  itemCardMissing: {
    borderColor: COLORS.error + '40'
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm
  },
  titleCol: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  itemIcon: {
    fontSize: 16,
    marginRight: SPACING.sm
  },
  itemType: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary
  },
  requiredBadge: {
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm
  },
  requiredText: {
    fontSize: FONTS.small - 2,
    fontWeight: FONTS.weightBold
  },
  fileMatchContainer: {
    backgroundColor: COLORS.surfaceVariant,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
    alignItems: 'center'
  },
  matchLabel: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    marginRight: SPACING.xs
  },
  matchValue: {
    fontSize: FONTS.caption,
    color: COLORS.primary,
    fontWeight: FONTS.weightSemiBold,
    flex: 1
  },
  missingLabel: {
    fontSize: FONTS.caption,
    color: COLORS.error,
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

export default MissingDocsScreen;
