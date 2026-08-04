import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';

import Header from '../components/Header';
import useCaseStore from '../store/useCaseStore';
import { predictOpponentArguments } from '../services/opponentPredictor';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

const OpponentPredictorScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { caseId, caseTitle } = route.params;

  const caseObj = useCaseStore((state) => state.getCaseById(caseId));
  const setOpponentPrediction = useCaseStore((state) => state.setOpponentPrediction);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [activeTab, setActiveTab] = useState('arguments'); // 'arguments' or 'vulnerabilities'
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    if (caseObj?.opponentPrediction) {
      setPrediction(caseObj.opponentPrediction);
    }
  }, [caseObj?.opponentPrediction]);

  const handleRunScan = async () => {
    if (!caseObj) {
      Alert.alert('Error', 'Case folder not found.');
      return;
    }

    setIsAnalyzing(true);
    setProgressText('Initializing opponent predictor...');
    setProgressPercent(0);
    setPrediction(null);

    try {
      const result = await predictOpponentArguments(caseId, 'defense', (text, current, total) => {
        setProgressText(text);
        setProgressPercent(total > 0 ? (current / total) * 100 : 0);
      });

      setPrediction(result);
      setOpponentPrediction(caseId, result);
    } catch (e) {
      Alert.alert('Scan Error', e.message || 'An error occurred during prediction.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Opponent Predictor 🎯"
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
            Simulating case analysis from the opponent's legal stance to anticipate arguments...
          </Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {!prediction ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎯</Text>
              <Text style={styles.emptyTitle}>Opponent Argument Predictor</Text>
              <Text style={styles.emptyDesc}>
                Anticipate the opponent's courtroom strategy. The predictor reviews linked case documents to extract likely defense/prosecution arguments, map counter-strategies, and pinpoint potential vulnerabilities in your case.
              </Text>
              <TouchableOpacity style={styles.actionBtn} onPress={handleRunScan}>
                <Text style={styles.actionBtnText}>Predict Opponent Stance</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.innerContainer}>
              {/* Tab Selector */}
              <View style={styles.tabRow}>
                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'arguments' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('arguments')}
                >
                  <Text style={[styles.tabButtonText, activeTab === 'arguments' && styles.tabButtonTextActive]}>
                    Arguments & Counters
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabButton, activeTab === 'vulnerabilities' && styles.tabButtonActive]}
                  onPress={() => setActiveTab('vulnerabilities')}
                >
                  <Text style={[styles.tabButtonText, activeTab === 'vulnerabilities' && styles.tabButtonTextActive]}>
                    Our Vulnerabilities
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {activeTab === 'arguments' ? (
                  <View>
                    <View style={styles.tabHeaderCard}>
                      <Text style={styles.tabHeaderTitle}>Predicted Opponent Arguments</Text>
                      <Text style={styles.tabHeaderDesc}>
                        Below are the predicted legal arguments the opponent will raise and suggested counter-responses.
                      </Text>
                    </View>

                    {prediction.likelyArguments.map((arg, idx) => {
                      const counter = prediction.counterarguments[idx] || 'Review file facts to frame a suitable response.';
                      return (
                        <View key={idx} style={styles.predictionCard}>
                          <View style={styles.argumentSection}>
                            <View style={styles.labelBadgeRow}>
                              <View style={[styles.badge, styles.badgeOpponent]}>
                                <Text style={styles.badgeTextOpponent}>OPPONENT ARGUMENT</Text>
                              </View>
                            </View>
                            <Text style={styles.argumentText}>{arg}</Text>
                          </View>

                          <View style={styles.counterSection}>
                            <View style={styles.labelBadgeRow}>
                              <View style={[styles.badge, styles.badgeCounter]}>
                                <Text style={styles.badgeTextCounter}>SUGGESTED COUNTER</Text>
                              </View>
                            </View>
                            <Text style={styles.counterText}>{counter}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View>
                    <View style={styles.tabHeaderCard}>
                      <Text style={styles.tabHeaderTitle}>Our Strategic Vulnerabilities</Text>
                      <Text style={styles.tabHeaderDesc}>
                        Critical weaknesses or evidentiary gaps in our case that the opponent could exploit.
                      </Text>
                    </View>

                    {prediction.vulnerabilities.map((vuln, idx) => (
                      <View key={idx} style={styles.vulnCard}>
                        <Text style={styles.vulnBullet}>⚠️</Text>
                        <Text style={styles.vulnText}>{vuln}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={styles.reScanBtn} onPress={handleRunScan}>
                  <Text style={styles.reScanBtnText}>Re-Predict Arguments</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
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
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent'
  },
  tabButtonActive: {
    borderBottomColor: COLORS.primary
  },
  tabButtonText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weightSemiBold
  },
  tabButtonTextActive: {
    color: COLORS.primary,
    fontWeight: FONTS.weightBold
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl
  },
  tabHeaderCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  tabHeaderTitle: {
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs
  },
  tabHeaderDesc: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    lineHeight: 18
  },
  predictionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden'
  },
  argumentSection: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  counterSection: {
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceVariant + '30'
  },
  labelBadgeRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm
  },
  badgeOpponent: {
    backgroundColor: COLORS.error + '20'
  },
  badgeTextOpponent: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.error
  },
  badgeCounter: {
    backgroundColor: COLORS.success + '20'
  },
  badgeTextCounter: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.success
  },
  argumentText: {
    fontSize: FONTS.caption,
    color: COLORS.textPrimary,
    lineHeight: 20
  },
  counterText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    lineHeight: 20
  },
  vulnCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  vulnBullet: {
    fontSize: 16,
    marginRight: SPACING.sm
  },
  vulnText: {
    fontSize: FONTS.caption,
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: 20
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
  },
  innerContainer: {
    flex: 1
  }
});

export default OpponentPredictorScreen;
