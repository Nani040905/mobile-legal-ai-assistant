/*
 * BenchmarkScreen.tsx — UI Screen for running model performance and retrieval benchmarks.
 *
 * PURPOSE: Provides an in-app control panel for developers and advanced users to
 * verify retrieval accuracy and profile LLM inference throughput, load latency,
 * and memory utilization on-device.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import modelManager, { ModelStatus, ModelConfig } from '../services/modelManager';
import {
  measureModelLoadTime,
  measureInferenceLatency,
  measurePeakMemory,
  InferenceMetrics,
} from '../evaluation/performanceBenchmark';
import {
  runFullBenchmark,
  RetrievalBenchmarkResult,
} from '../evaluation/retrievalBenchmark';

type Tab = 'performance' | 'retrieval';

const BenchmarkScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<Tab>('performance');
  const [modelStatus, setModelStatus] = useState<ModelStatus>(modelManager.getStatus());
  const [activeModel, setActiveModel] = useState<ModelConfig>(modelManager.getActiveModel());

  // Performance benchmark state
  const [isRunningLoadTest, setIsRunningLoadTest] = useState(false);
  const [isRunningSpeedTest, setIsRunningSpeedTest] = useState(false);
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);
  const [speedMetrics, setSpeedMetrics] = useState<InferenceMetrics | null>(null);
  const [currentSpeedText, setCurrentSpeedText] = useState('');
  const [peakMemoryBytes, setPeakMemoryBytes] = useState<number | null>(null);

  // Retrieval benchmark state
  const [isRunningRetrievalTest, setIsRunningRetrievalTest] = useState(false);
  const [retrievalResult, setRetrievalResult] = useState<RetrievalBenchmarkResult | null>(null);

  useEffect(() => {
    // Sync model status
    const unsubscribe = modelManager.addStatusListener((status) => {
      setModelStatus(status);
      setActiveModel(modelManager.getActiveModel());
    });

    // Capture initial native memory baseline
    measurePeakMemory().then((mem) => {
      if (mem > 0) setPeakMemoryBytes(mem);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleRunLoadTest = async () => {
    try {
      setIsRunningLoadTest(true);
      setLoadTimeMs(null);

      // Unload active model, start timer, load model, measure
      const duration = await measureModelLoadTime();
      setLoadTimeMs(duration);

      // Capture native heap memory after loading
      const mem = await measurePeakMemory();
      if (mem > 0) setPeakMemoryBytes(mem);

      Alert.alert('Load Time Test Complete', `Model loaded in ${(duration / 1000).toFixed(2)} seconds.`);
    } catch (error: any) {
      console.error('[BenchmarkScreen] Load test failed:', error);
      Alert.alert('Test Failed', error.message || 'Unknown load test error.');
    } finally {
      setIsRunningLoadTest(false);
    }
  };

  const handleRunSpeedTest = async () => {
    if (modelStatus !== 'ready') {
      Alert.alert('Model Not Loaded', 'Please load the model in the Settings tab before running inference speed test.');
      return;
    }

    try {
      setIsRunningSpeedTest(true);
      setSpeedMetrics(null);
      setCurrentSpeedText('');

      const benchmarkPrompt = 'Explain the concept of basic legal rights under the Constitution of India in brief.';
      
      const metrics = await measureInferenceLatency(benchmarkPrompt, (token) => {
        setCurrentSpeedText((prev) => prev + token);
      });

      setSpeedMetrics(metrics);

      // Capture native heap memory during/after active generation
      const mem = await measurePeakMemory();
      if (mem > 0) setPeakMemoryBytes(mem);

    } catch (error: any) {
      console.error('[BenchmarkScreen] Speed test failed:', error);
      Alert.alert('Test Failed', error.message || 'Unknown speed test error.');
    } finally {
      setIsRunningSpeedTest(false);
    }
  };

  const handleRunRetrievalTest = async () => {
    try {
      setIsRunningRetrievalTest(true);
      setRetrievalResult(null);

      const result = await runFullBenchmark();
      setRetrievalResult(result);
    } catch (error: any) {
      console.error('[BenchmarkScreen] Retrieval test failed:', error);
      Alert.alert('Test Failed', error.message || 'Unknown retrieval benchmark error.');
    } finally {
      setIsRunningRetrievalTest(false);
    }
  };

  const formatBytes = (bytes: number | null): string => {
    if (bytes === null || bytes === 0) return 'N/A';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(0)} MB`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Performance Benchmarks"
        subtitle="Verify on-device AI speeds & search accuracy"
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'performance' && styles.tabButtonActive]}
          onPress={() => setActiveTab('performance')}
        >
          <Text style={[styles.tabText, activeTab === 'performance' && styles.tabTextActive]}>
            🤖 Model Speed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'retrieval' && styles.tabButtonActive]}
          onPress={() => setActiveTab('retrieval')}
        >
          <Text style={[styles.tabText, activeTab === 'retrieval' && styles.tabTextActive]}>
            🔍 Search Recall
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'performance' ? (
          // ─── PERFORMANCE TAB ───
          <View>
            {/* Active Model Status Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Current Status</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Selected Model</Text>
                <Text style={styles.infoValue}>{activeModel.name}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status</Text>
                <Text style={[styles.infoValue, { color: modelStatus === 'ready' ? COLORS.success : COLORS.warning }]}>
                  {modelStatus.toUpperCase()}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Peak RAMFootprint</Text>
                <Text style={styles.infoValue}>{formatBytes(peakMemoryBytes)}</Text>
              </View>
            </View>

            {/* Load Time Benchmark Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Model Load Time</Text>
              <Text style={styles.helperText}>
                Measures the duration to load model weights from the local filesystem and create the llama.rn context. This unloads and reloads the model context.
              </Text>
              {loadTimeMs !== null && (
                <View style={styles.metricResultContainer}>
                  <Text style={styles.metricResultVal}>
                    {(loadTimeMs / 1000).toFixed(2)}s
                  </Text>
                  <Text style={styles.metricResultLbl}>Load Duration</Text>
                </View>
              )}
              <TouchableOpacity
                style={[styles.actionButton, isRunningLoadTest && styles.disabledButton]}
                onPress={handleRunLoadTest}
                disabled={isRunningLoadTest || isRunningSpeedTest}
              >
                {isRunningLoadTest ? (
                  <ActivityIndicator size="small" color={COLORS.textPrimary} />
                ) : (
                  <Text style={styles.buttonText}>🔌 Run Load Time Test</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Inference Speed Benchmark Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Inference Throughput</Text>
              <Text style={styles.helperText}>
                Executes a prompt to generate 50 tokens, measuring throughput in tokens per second and latency per token.
              </Text>

              {speedMetrics && (
                <View style={styles.metricsGrid}>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridVal}>{speedMetrics.tokensPerSecond.toFixed(1)}</Text>
                    <Text style={styles.gridLbl}>tokens/sec</Text>
                  </View>
                  <View style={styles.gridItem}>
                    <Text style={styles.gridVal}>{speedMetrics.msPerToken.toFixed(0)}ms</Text>
                    <Text style={styles.gridLbl}>per token</Text>
                  </View>
                </View>
              )}

              {isRunningSpeedTest && (
                <View style={styles.streamBox}>
                  <Text style={styles.streamTitle}>Generating live benchmark tokens:</Text>
                  <Text style={styles.streamText}>{currentSpeedText || 'Loading engine...'}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  (modelStatus !== 'ready' || isRunningSpeedTest) && styles.disabledButton,
                ]}
                onPress={handleRunSpeedTest}
                disabled={modelStatus !== 'ready' || isRunningSpeedTest || isRunningLoadTest}
              >
                {isRunningSpeedTest ? (
                  <ActivityIndicator size="small" color={COLORS.textPrimary} />
                ) : (
                  <Text style={styles.buttonText}>⚡ Run Speed Test</Text>
                )}
              </TouchableOpacity>
              {modelStatus !== 'ready' && (
                <Text style={styles.warningMessage}>
                  * Please load the model first under Settings screen before running this speed test.
                </Text>
              )}
            </View>
          </View>
        ) : (
          // ─── RETRIEVAL TAB ───
          <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Search Quality & Accuracy</Text>
              <Text style={styles.helperText}>
                Runs the BM25 retrieval engine across all 50 golden benchmark questions and 50 legal documents, comparing search output rank positions against expected values.
              </Text>

              {retrievalResult && (
                <View style={{ marginVertical: SPACING.md }}>
                  <View style={styles.metricsGrid}>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridVal}>{retrievalResult.precision}%</Text>
                      <Text style={styles.gridLbl}>P@1 (Top Match)</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridVal}>{retrievalResult.recall5}%</Text>
                      <Text style={styles.gridLbl}>Recall@5</Text>
                    </View>
                  </View>

                  <View style={styles.metricsGrid}>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridVal}>{retrievalResult.mrr}</Text>
                      <Text style={styles.gridLbl}>MRR Score</Text>
                    </View>
                    <View style={styles.gridItem}>
                      <Text style={styles.gridVal}>{retrievalResult.avgLatencyMs}ms</Text>
                      <Text style={styles.gridLbl}>Avg Search Speed</Text>
                    </View>
                  </View>

                  {retrievalResult.failingQueries.length > 0 && (
                    <View style={styles.failingQueriesBox}>
                      <Text style={styles.failingTitle}>
                        ⚠️ Discrepancy Warnings ({retrievalResult.failingQueries.length})
                      </Text>
                      <Text style={styles.failingSubtitle}>
                        Below queries did not rank the correct context as rank #1:
                      </Text>
                      {retrievalResult.failingQueries.slice(0, 3).map((fail, i) => (
                        <View key={i} style={styles.failItem}>
                          <Text style={styles.failQuery}>"{fail.query}"</Text>
                          <Text style={styles.failDetails}>
                            Expected Chunk Index: {fail.rank > 0 ? `#${fail.rank}` : 'Not in top 10'}
                          </Text>
                        </View>
                      ))}
                      {retrievalResult.failingQueries.length > 3 && (
                        <Text style={styles.failMoreText}>
                          ...and {retrievalResult.failingQueries.length - 3} more. Check node CLI for full breakdown.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity
                style={[styles.actionButton, isRunningRetrievalTest && styles.disabledButton]}
                onPress={handleRunRetrievalTest}
                disabled={isRunningRetrievalTest}
              >
                {isRunningRetrievalTest ? (
                  <ActivityIndicator size="small" color={COLORS.textPrimary} />
                ) : (
                  <Text style={styles.buttonText}>🔍 Run Retrieval Benchmark</Text>
                )}
              </TouchableOpacity>
            </View>
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
  },
  tabButtonActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
  },
  helperText: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  unloadButton: {
    backgroundColor: COLORS.error,
  },
  disabledButton: {
    backgroundColor: COLORS.border,
    opacity: 0.6,
  },
  buttonText: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    color: COLORS.background,
  },
  metricResultContainer: {
    alignItems: 'center',
    marginVertical: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
  },
  metricResultVal: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  metricResultLbl: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: SPACING.xs,
  },
  gridItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
  },
  gridVal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  gridLbl: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  streamBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  streamTitle: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  streamText: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightRegular,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  warningMessage: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightRegular,
    color: COLORS.warning,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  failingQueriesBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  failingTitle: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    color: COLORS.warning,
  },
  failingSubtitle: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary,
    marginVertical: SPACING.xs,
  },
  failItem: {
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  failQuery: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightRegular,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
  },
  failDetails: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightRegular,
    color: COLORS.warning,
    marginTop: SPACING.xs,
  },
  failMoreText: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});

export default BenchmarkScreen;
