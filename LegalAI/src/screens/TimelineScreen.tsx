import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

import Header from '../components/Header';
import useCaseStore from '../store/useCaseStore';
import useDocumentStore, { Document } from '../store/useDocumentStore';
import { generateTimeline, TimelineEvent } from '../services/timelineGenerator';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

type RoutePropType = RouteProp<RootStackParamList, 'Timeline'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Timeline'>;

const TimelineScreen: React.FC = () => {
  const route = useRoute<RoutePropType>();
  const navigation = useNavigation<NavigationProp>();
  const { caseId, caseTitle } = route.params;

  const caseObj = useCaseStore((state) => state.getCaseById(caseId));
  const allDocs = useDocumentStore((state) => state.documents);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  useEffect(() => {
    // Component mounted
  }, []);

  const handleGenerateTimeline = async () => {
    if (!caseObj || caseObj.documents.length === 0) {
      Alert.alert('No Documents', 'Please link documents to this case folder before generating a timeline.');
      return;
    }

    const linkedDocs: Document[] = allDocs.filter(d => caseObj.documents.includes(d.id));
    if (linkedDocs.length === 0) {
      Alert.alert('No Valid Documents', 'The linked documents could not be found.');
      return;
    }

    setIsAnalyzing(true);
    setProgressText('Initializing AI model...');
    setProgressPercent(0);
    setEvents([]);

    try {
      const generatedEvents = await generateTimeline(linkedDocs, (text, current, total) => {
        setProgressText(text);
        setProgressPercent(total > 0 ? (current / total) * 100 : 0);
      });

      setEvents(generatedEvents);
      setHasAnalyzed(true);
    } catch (e: any) {
      Alert.alert('Analysis Error', e.message || 'An error occurred while extracting timeline events.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getConfidenceColor = (conf: 'High' | 'Low' | 'Medium') => {
    switch (conf) {
      case 'High': return COLORS.success;
      case 'Medium': return COLORS.warning;
      case 'Low': return COLORS.error;
      default: return COLORS.textSecondary;
    }
  };

  const renderEventItem = ({ item, index }: { item: TimelineEvent; index: number }) => {
    const isLast = index === events.length - 1;
    
    return (
      <View style={styles.eventRow}>
        {/* Timeline Visual Line & Dot */}
        <View style={styles.timelineColumn}>
          <View style={styles.timelineDot} />
          {!isLast && <View style={styles.timelineLine} />}
        </View>

        {/* Event Content Card */}
        <View style={styles.eventCard}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventDate}>{item.date}</Text>
            <View style={[styles.confidenceBadge, { borderColor: getConfidenceColor(item.confidence) }]}>
              <Text style={[styles.confidenceText, { color: getConfidenceColor(item.confidence) }]}>
                {item.confidence}
              </Text>
            </View>
          </View>
          
          <Text style={styles.eventDescription}>{item.description}</Text>
          
          <View style={styles.eventFooter}>
            <Text style={styles.sourceIcon}>📄</Text>
            <Text style={styles.sourceText} numberOfLines={1}>{item.sourceDocName}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Case Timeline"
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
            Scanning document chunks across multiple files...
          </Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {!hasAnalyzed ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyTitle}>Chronological Timeline</Text>
              <Text style={styles.emptyDesc}>
                The AI will scan all attached documents to build a chronological sequence of events, finding dates and incidents automatically.
              </Text>
              <TouchableOpacity style={styles.actionBtn} onPress={handleGenerateTimeline}>
                <Text style={styles.actionBtnText}>Generate Timeline</Text>
              </TouchableOpacity>
            </View>
          ) : events.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No Events Found</Text>
              <Text style={styles.emptyDesc}>
                We couldn't extract any specific chronological dates or events from the attached documents.
              </Text>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleGenerateTimeline}>
                <Text style={styles.secondaryBtnText}>Retry Analysis</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={events}
              keyExtractor={(item) => item.id}
              renderItem={renderEventItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                <View style={styles.listHeader}>
                  <Text style={styles.listHeaderText}>Extracted Events ({events.length})</Text>
                  <TouchableOpacity style={styles.refreshBtn} onPress={handleGenerateTimeline}>
                    <Text style={styles.refreshBtnText}>↻ Re-run</Text>
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
  refreshBtn: {
    padding: SPACING.xs,
  },
  refreshBtnText: {
    color: COLORS.primary,
    fontSize: FONTS.caption,
  },
  eventRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  timelineColumn: {
    width: 30,
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginTop: 6,
    zIndex: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.border,
    marginTop: -6,
    marginBottom: -SPACING.md, // Connect to next item
    zIndex: 1,
  },
  eventCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  eventDate: {
    color: COLORS.primary,
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    flex: 1,
  },
  confidenceBadge: {
    borderWidth: 1,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.sm,
  },
  confidenceText: {
    fontSize: FONTS.small,
    fontWeight: FONTS.weightBold,
  },
  eventDescription: {
    color: COLORS.textPrimary,
    fontSize: FONTS.body,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceVariant,
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  sourceIcon: {
    fontSize: 12,
    marginRight: SPACING.xs,
  },
  sourceText: {
    color: COLORS.textSecondary,
    fontSize: FONTS.caption,
    flex: 1,
  },
});

export default TimelineScreen;
