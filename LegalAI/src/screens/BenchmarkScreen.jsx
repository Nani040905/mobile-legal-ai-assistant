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
  Alert } from
'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';
import modelManager from '../services/modelManager';
import {
  measureModelLoadTime,
  measureInferenceLatency,
  measurePeakMemory } from

'../evaluation/performanceBenchmark';
import {
  runFullBenchmark } from

'../evaluation/retrievalBenchmark';
import {
  runModelComparison } from

'../evaluation/modelComparison';



const BenchmarkScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('performance');
  const [modelStatus, setModelStatus] = useState(modelManager.getStatus());
  const [activeModel, setActiveModel] = useState(modelManager.getActiveModel());

  // Performance benchmark state
  const [isRunningLoadTest, setIsRunningLoadTest] = useState(false);
  const [isRunningSpeedTest, setIsRunningSpeedTest] = useState(false);

  // Model Comparison state
  const [isRunningComparison, setIsRunningComparison] = useState(false);
  const [comparisonResults, setComparisonResults] = useState([]);
  const [comparisonProgressText, setComparisonProgressText] = useState('');
  const [loadTimeMs, setLoadTimeMs] = useState(null);
  const [speedMetrics, setSpeedMetrics] = useState(null);
  const [currentSpeedText, setCurrentSpeedText] = useState('');
  const [peakMemoryBytes, setPeakMemoryBytes] = useState(null);

  // Retrieval benchmark state
  const [isRunningRetrievalTest, setIsRunningRetrievalTest] = useState(false);
  const [retrievalResult, setRetrievalResult] = useState(null);

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
    } catch (error) {
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

    } catch (error) {
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
    } catch (error) {
      console.error('[BenchmarkScreen] Retrieval test failed:', error);
      Alert.alert('Test Failed', error.message || 'Unknown retrieval benchmark error.');
    } finally {
      setIsRunningRetrievalTest(false);
    }
  };

  const handleRunComparison = async () => {
    try {
      setIsRunningComparison(true);
      setComparisonResults([]);
      setComparisonProgressText('Starting comparison...');

      const modelIds = ['qwen-2.5-3b', 'qwen-2.5-1.5b', 'llama-3.2-1b'];
      const results = await runModelComparison(modelIds, (text) => {
        setComparisonProgressText(text);
      });

      setComparisonResults(results);
      setModelStatus(modelManager.getStatus());
      setActiveModel(modelManager.getActiveModel());

      Alert.alert('Model Comparison Complete', 'Successfully ran benchmarks across downloaded models.');
    } catch (error) {
      console.error('[BenchmarkScreen] Comparison test failed:', error);
      Alert.alert('Test Failed', error.message || 'Unknown model comparison benchmark error.');
    } finally {
      setIsRunningComparison(false);
      setComparisonProgressText('');
    }
  };

  const formatBytes = (bytes) => {
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
        onBackPress={() => navigation.goBack()} />
      

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'performance' && styles.tabButtonActive]}
          onPress={() => setActiveTab('performance')}>
          
          <Text style={[styles.tabText, activeTab === 'performance' && styles.tabTextActive]}>
            🤖 Model Speed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'retrieval' && styles.tabButtonActive]}
          onPress={() => setActiveTab('retrieval')}>
          
          <Text style={[styles.tabText, activeTab === 'retrieval' && styles.tabTextActive]}>
            🔍 Search Recall
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'comparison' && styles.tabButtonActive]}
          onPress={() => setActiveTab('comparison')}>
          
          <Text style={[styles.tabText, activeTab === 'comparison' && styles.tabTextActive]}>
            📊 Compare Models
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'performance' &&
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
              {loadTimeMs !== null &&
            <View style={styles.metricResultContainer}>
                  <Text style={styles.metricResultVal}>
                    {(loadTimeMs / 1000).toFixed(2)}s
                  </Text>
                  <Text style={styles.metricResultLbl}>Load Duration</Text>
                </View>
            }
              <TouchableOpacity
              style={[styles.actionButton, isRunningLoadTest && styles.disabledButton]}
              onPress={handleRunLoadTest}
              disabled={isRunningLoadTest || isRunningSpeedTest}>
              
                {isRunningLoadTest ?
              <ActivityIndicator size="small" color={COLORS.textPrimary} /> :

              <Text style={styles.buttonText}>🔌 Run Load Time Test</Text>
              }
              </TouchableOpacity>
            </View>

            {/* Inference Speed Benchmark Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Inference Throughput</Text>
              <Text style={styles.helperText}>
                Executes a prompt to generate 50 tokens, measuring throughput in tokens per second and latency per token.
              </Text>

              {speedMetrics &&
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
            }

              {isRunningSpeedTest &&
            <View style={styles.streamBox}>
                  <Text style={styles.streamTitle}>Generating live benchmark tokens:</Text>
                  <Text style={styles.streamText}>{currentSpeedText || 'Loading engine...'}</Text>
                </View>
            }

              <TouchableOpacity
              style={[
              styles.actionButton,
              (modelStatus !== 'ready' || isRunningSpeedTest) && styles.disabledButton]
              }
              onPress={handleRunSpeedTest}
              disabled={modelStatus !== 'ready' || isRunningSpeedTest || isRunningLoadTest}>
              
                {isRunningSpeedTest ?
              <ActivityIndicator size="small" color={COLORS.textPrimary} /> :

              <Text style={styles.buttonText}>⚡ Run Speed Test</Text>
              }
              </TouchableOpacity>
              {modelStatus !== 'ready' &&
            <Text style={styles.warningMessage}>
                  * Please load the model first under Settings screen before running this speed test.
                </Text>
            }
            </View>
          </View>
        }

        {activeTab === 'retrieval' &&
        // ─── RETRIEVAL TAB ───
        <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Search Quality & Accuracy</Text>
              <Text style={styles.helperText}>
                Runs the BM25 retrieval engine across all 50 golden benchmark questions and 50 legal documents, comparing search output rank positions against expected values.
              </Text>

              {retrievalResult &&
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

                  {retrievalResult.failingQueries.length > 0 &&
              <View style={styles.failingQueriesBox}>
                      <Text style={styles.failingTitle}>
                        ⚠️ Discrepancy Warnings ({retrievalResult.failingQueries.length})
                      </Text>
                      <Text style={styles.failingSubtitle}>
                        Below queries did not rank the correct context as rank #1:
                      </Text>
                      {retrievalResult.failingQueries.slice(0, 3).map((fail, i) =>
                <View key={i} style={styles.failItem}>
                          <Text style={styles.failQuery}>"{fail.query}"</Text>
                          <Text style={styles.failDetails}>
                            Expected Chunk Index: {fail.rank > 0 ? `#${fail.rank}` : 'Not in top 10'}
                          </Text>
                        </View>
                )}
                      {retrievalResult.failingQueries.length > 3 &&
                <Text style={styles.failMoreText}>
                          ...and {retrievalResult.failingQueries.length - 3} more. Check node CLI for full breakdown.
                        </Text>
                }
                    </View>
              }
                </View>
            }

              <TouchableOpacity
              style={[styles.actionButton, isRunningRetrievalTest && styles.disabledButton]}
              onPress={handleRunRetrievalTest}
              disabled={isRunningRetrievalTest}>
              
                {isRunningRetrievalTest ?
              <ActivityIndicator size="small" color={COLORS.textPrimary} /> :

              <Text style={styles.buttonText}>🔍 Run Retrieval Benchmark</Text>
              }
              </TouchableOpacity>
            </View>
          </View>
        }

        {activeTab === 'comparison' &&
        <View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Offline LLM Model Comparison</Text>
              <Text style={styles.helperText}>
                Compares reasoning capabilities, file sizes, memory utilization, and response speeds of Qwen 3B, Qwen 1.5B, and Llama 1B local models.
              </Text>

              {comparisonResults.length > 0 &&
            <View style={styles.tableContainer}>
                  {/* Table Header */}
                  <View style={[styles.tableRow, styles.tableHeaderRow]}>
                    <Text style={[styles.tableColHeader, styles.tableColHeaderModel]}>Model</Text>
                    <Text style={styles.tableColHeader}>Load</Text>
                    <Text style={styles.tableColHeader}>Tok/s</Text>
                    <Text style={styles.tableColHeader}>RAM</Text>
                    <Text style={styles.tableColHeader}>Halluc</Text>
                    <Text style={styles.tableColHeader}>Acc</Text>
                  </View>
                  {/* Table Body */}
                  {comparisonResults.map((res) =>
              <View key={res.modelId} style={styles.tableRow}>
                      <Text style={[styles.tableCellName, styles.tableCellNameFlex]}>
                        {res.modelId === 'qwen-2.5-3b' ? 'Qwen 3B' : res.modelId === 'qwen-2.5-1.5b' ? 'Qwen 1.5B' : 'Llama 1B'}
                      </Text>
                      {res.downloaded ?
                <>
                          <Text style={styles.tableCell}>
                            {res.loadTimeMs !== null ? `${(res.loadTimeMs / 1000).toFixed(1)}s` : 'N/A'}
                          </Text>
                          <Text style={styles.tableCell}>
                            {res.tokensPerSecond !== null ? `${res.tokensPerSecond}` : 'N/A'}
                          </Text>
                          <Text style={styles.tableCell}>
                            {res.peakRamMb !== null ? `${res.peakRamMb}MB` : 'N/A'}
                          </Text>
                          <Text style={styles.tableCell}>
                            {res.hallucinationScore !== null ? `${res.hallucinationScore}%` : 'N/A'}
                          </Text>
                          <Text style={styles.tableCell}>
                            {res.accuracyScore !== null ? `${res.accuracyScore}%` : 'N/A'}
                          </Text>
                        </> :

                  <Text style={[styles.tableCell, styles.tableCellNotDownloaded]}>
                          Not Downloaded
                        </Text>
                }
                    </View>
              )}
                </View>
            }

              {isRunningComparison &&
            <View style={styles.progressOverlay}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.progressOverlayText}>{comparisonProgressText}</Text>
                </View>
            }

              <TouchableOpacity
              style={[
              styles.actionButton,
              (isRunningComparison || isRunningLoadTest || isRunningSpeedTest || isRunningRetrievalTest) &&
              styles.disabledButton]
              }
              onPress={handleRunComparison}
              disabled={isRunningComparison || isRunningLoadTest || isRunningSpeedTest || isRunningRetrievalTest}>
              
                {isRunningComparison ?
              <ActivityIndicator size="small" color={COLORS.textPrimary} /> :

              <Text style={styles.buttonText}>📊 Run Model Comparison</Text>
              }
              </TouchableOpacity>
            </View>
          </View>
        }
      </ScrollView>
    </SafeAreaView>);

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md
  },
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border
  },
  tabButtonActive: {
    borderBottomColor: COLORS.primary
  },
  tabText: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textSecondary
  },
  tabTextActive: {
    color: COLORS.primary
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  cardTitle: {
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
    marginBottom: SPACING.md
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  infoLabel: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary
  },
  infoValue: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary
  },
  helperText: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 18
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.md
  },
  unloadButton: {
    backgroundColor: COLORS.error
  },
  disabledButton: {
    backgroundColor: COLORS.border,
    opacity: 0.6
  },
  buttonText: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    color: COLORS.background
  },
  metricResultContainer: {
    alignItems: 'center',
    marginVertical: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md
  },
  metricResultVal: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.primary
  },
  metricResultLbl: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: SPACING.xs
  },
  gridItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md
  },
  gridVal: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary
  },
  gridLbl: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs
  },
  streamBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  streamTitle: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.primary,
    marginBottom: SPACING.xs
  },
  streamText: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightRegular,
    color: COLORS.textPrimary,
    fontFamily: 'monospace',
    lineHeight: 20
  },
  warningMessage: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightRegular,
    color: COLORS.warning,
    marginTop: SPACING.md,
    textAlign: 'center'
  },
  failingQueriesBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  failingTitle: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
    color: COLORS.warning
  },
  failingSubtitle: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary,
    marginVertical: SPACING.xs
  },
  failItem: {
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  failQuery: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightRegular,
    color: COLORS.textPrimary,
    fontStyle: 'italic'
  },
  failDetails: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightRegular,
    color: COLORS.warning,
    marginTop: SPACING.xs
  },
  failMoreText: {
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightRegular,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center'
  },
  tableContainer: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginTop: SPACING.md,
    marginBottom: SPACING.md
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  tableHeaderRow: {
    backgroundColor: COLORS.surfaceVariant
  },
  tableColHeader: {
    flex: 1,
    fontSize: 12,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
    textAlign: 'center'
  },
  tableCellName: {
    fontSize: 13,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center'
  },
  tableColHeaderModel: {
    flex: 2,
    textAlign: 'left'
  },
  tableCellNameFlex: {
    flex: 2
  },
  tableCellNotDownloaded: {
    flex: 5,
    color: COLORS.warning,
    fontWeight: 'bold'
  },
  progressOverlay: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  progressOverlayText: {
    color: COLORS.textPrimary,
    fontSize: FONTS.caption,
    marginTop: SPACING.sm,
    textAlign: 'center'
  }
});

export default BenchmarkScreen;