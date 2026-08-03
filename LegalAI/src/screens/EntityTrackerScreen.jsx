import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import useCaseStore from '../store/useCaseStore';
import useDocumentStore from '../store/useDocumentStore';
import { buildEntityIndex } from '../services/entityTracker';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

const ENTITY_TYPE_CONFIG = {
  person: { label: 'People Involved', icon: '👥', color: '#4299E1' },
  date: { label: 'Key Dates', icon: '📅', color: '#ED8936' },
  amount: { label: 'Financial Amounts', icon: '💰', color: '#48BB78' },
  address: { label: 'Addresses & Locations', icon: '📍', color: '#ED64A6' },
  phone: { label: 'Contact Numbers', icon: '📞', color: '#38B2AC' },
  vehicle: { label: 'Vehicles', icon: '🚗', color: '#9F7AEA' },
  caseNumber: { label: 'Case & FIR Numbers', icon: '🔢', color: '#667EEA' },
  section: { label: 'Legal Sections & Acts', icon: '📖', color: '#ECC94B' }
};

const EntityTrackerScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { caseId, caseTitle } = route.params;

  const caseObj = useCaseStore((state) => state.getCaseById(caseId));
  const setEntityIndex = useCaseStore((state) => state.setEntityIndex);
  const allDocs = useDocumentStore((state) => state.documents);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [entityIndex, setLocalEntityIndex] = useState({});
  const [expandedTypes, setExpandedTypes] = useState({});
  const [expandedEntities, setExpandedEntities] = useState({});

  useEffect(() => {
    if (caseObj?.entityIndex) {
      setLocalEntityIndex(caseObj.entityIndex);
    }
  }, [caseObj?.entityIndex]);

  const handleRunScan = async () => {
    if (!caseObj || !caseObj.documents || caseObj.documents.length === 0) {
      Alert.alert(
        'No Documents Linked',
        'Please link at least one document to this case folder before tracking entities.'
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
    setProgressText('Initializing entity extractor...');
    setProgressPercent(0);
    setLocalEntityIndex({});

    try {
      const result = await buildEntityIndex(caseId, (text, current, total) => {
        setProgressText(text);
        setProgressPercent(total > 0 ? (current / total) * 100 : 0);
      });

      setLocalEntityIndex(result);
      setEntityIndex(caseId, result);
    } catch (e) {
      Alert.alert('Scan Error', e.message || 'An error occurred during entity tracking.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleType = (type) => {
    setExpandedTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const toggleEntity = (entityValue) => {
    setExpandedEntities(prev => ({
      ...prev,
      [entityValue]: !prev[entityValue]
    }));
  };

  const hasEntities = Object.values(entityIndex).some(arr => arr && arr.length > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Entity Tracker 👥"
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
            Scanning case documents for people, key dates, monetary values, and legal sections...
          </Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {!hasEntities ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>Cross-Document Entity Tracker</Text>
              <Text style={styles.emptyDesc}>
                Scan all documents linked to this case folder to extract, classify, and cross-reference key legal entities such as people, key dates, financial amounts, addresses, contact details, and relevant legal sections.
              </Text>
              <TouchableOpacity style={styles.actionBtn} onPress={handleRunScan}>
                <Text style={styles.actionBtnText}>Run Entity Scan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Case Entity Index</Text>
                <Text style={styles.summaryDesc}>
                  Select an entity type below to view extracted values. Tap any entity name to see its appearances and contextual text previews across all case documents.
                </Text>
              </View>

              {Object.keys(ENTITY_TYPE_CONFIG).map((type) => {
                const config = ENTITY_TYPE_CONFIG[type];
                const list = entityIndex[type] || [];
                if (list.length === 0) return null;

                const isTypeExpanded = !!expandedTypes[type];

                return (
                  <View key={type} style={styles.groupCard}>
                    <TouchableOpacity
                      style={styles.groupHeader}
                      activeOpacity={0.7}
                      onPress={() => toggleType(type)}
                    >
                      <View style={styles.groupTitleRow}>
                        <Text style={[styles.groupIcon, { color: config.color }]}>{config.icon}</Text>
                        <Text style={styles.groupLabel}>{config.label}</Text>
                      </View>
                      <View style={styles.badgeRow}>
                        <View style={[styles.countBadge, { backgroundColor: config.color + '20' }]}>
                          <Text style={[styles.countText, { color: config.color }]}>{list.length}</Text>
                        </View>
                        <Text style={styles.arrowIcon}>{isTypeExpanded ? '▲' : '▼'}</Text>
                      </View>
                    </TouchableOpacity>

                    {isTypeExpanded && (
                      <View style={styles.groupBody}>
                        {list.map((entity) => {
                          const isEntityExpanded = !!expandedEntities[entity.value];
                          return (
                            <View key={entity.value} style={styles.entityWrapper}>
                              <TouchableOpacity
                                style={styles.entityHeader}
                                activeOpacity={0.7}
                                onPress={() => toggleEntity(entity.value)}
                              >
                                <Text style={styles.entityValue}>{entity.value}</Text>
                                <View style={styles.appearanceBadgeRow}>
                                  <Text style={styles.appearanceBadgeText}>
                                    {entity.appearances.length} {entity.appearances.length === 1 ? 'appearance' : 'appearances'}
                                  </Text>
                                  <Text style={styles.smallArrowIcon}>{isEntityExpanded ? '▲' : '▼'}</Text>
                                </View>
                              </TouchableOpacity>

                              {isEntityExpanded && (
                                <View style={styles.entityAppearances}>
                                  {entity.appearances.map((app, idx) => (
                                    <View key={idx} style={styles.appearanceCard}>
                                      <View style={styles.appearanceHeader}>
                                        <View style={styles.docBadge}>
                                          <Text style={styles.docBadgeText} numberOfLines={1}>{app.docName}</Text>
                                        </View>
                                        <Text style={styles.chunkText}>Section {app.chunkIndex + 1}</Text>
                                      </View>
                                      <Text style={styles.previewText}>{app.preview}</Text>
                                    </View>
                                  ))}
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}

              <TouchableOpacity style={styles.reScanBtn} onPress={handleRunScan}>
                <Text style={styles.reScanBtnText}>Re-Scan Entities</Text>
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
  groupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden'
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.surface
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  groupIcon: {
    fontSize: 20,
    marginRight: SPACING.sm
  },
  groupLabel: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  countBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.sm
  },
  countText: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightBold
  },
  arrowIcon: {
    fontSize: 12,
    color: COLORS.textMuted
  },
  groupBody: {
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingVertical: SPACING.xs
  },
  entityWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: SPACING.xs
  },
  entityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md
  },
  entityValue: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: SPACING.sm
  },
  appearanceBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  appearanceBadgeText: {
    fontSize: FONTS.small,
    color: COLORS.textSecondary,
    marginRight: SPACING.xs
  },
  smallArrowIcon: {
    fontSize: 9,
    color: COLORS.textMuted
  },
  entityAppearances: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm
  },
  appearanceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  appearanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs
  },
  docBadge: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    maxWidth: '70%'
  },
  docBadgeText: {
    fontSize: FONTS.small,
    color: COLORS.primary,
    fontWeight: FONTS.weightSemiBold
  },
  chunkText: {
    fontSize: FONTS.small,
    color: COLORS.textMuted
  },
  previewText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic'
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

export default EntityTrackerScreen;
