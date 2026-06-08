/*
 * SettingsScreen.tsx — App settings, model info, and storage management.
 *
 * PURPOSE: Displays information about the local AI model, storage usage,
 * and provides a button to clear all stored documents. This is a fully
 * implemented screen (not a placeholder) — it's simple enough to complete now.
 *
 * DESIGN DECISIONS:
 * - Info cards for model and storage — clean, scannable layout.
 * - Destructive "Clear All" button uses the error color (red) for safety.
 * - Alert.alert() provides a native confirmation dialog before clearing.
 * - No external dependencies — purely informational display.
 *
 * FUTURE ENHANCEMENTS:
 * - Show actual storage usage from AsyncStorage
 * - Model download/update management
 * - Theme toggle (light/dark mode)
 */

/* Import React and lifecycle hooks */
import React, { useState, useEffect } from 'react';

/* Import RN components needed for this screen */
import {
  View,             // Layout container
  Text,             // Text rendering
  StyleSheet,       // Optimized styles
  TouchableOpacity, // Touchable wrapper with opacity feedback
  ScrollView,       // Scrollable container for overflow
  Alert,            // Native alert dialog — used for confirmation prompts
  ActivityIndicator, // Loader for model loading state
} from 'react-native';

/* SafeAreaView prevents content from overlapping device notches */
import { SafeAreaView } from 'react-native-safe-area-context';

/* useNavigation for the back button */
import { useNavigation } from '@react-navigation/native';

/* Import our reusable Header component */
import Header from '../components/Header';

/* Import theme tokens for consistent styling */
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

/* Import modelManager and store hooks */
import modelManager, { ModelStatus, ModelConfig } from '../services/modelManager';
import useDocumentStore from '../store/useDocumentStore';
import useChatStore from '../store/useChatStore';

/*
 * SettingsScreen — Displays model info, storage stats, and a clear data button.
 */
const SettingsScreen: React.FC = () => {
  /* Get navigation object for back button */
  const navigation = useNavigation();

  /* Local state to track the model status reactively */
  const [modelStatus, setModelStatus] = useState<ModelStatus>(modelManager.getStatus());

  /* Local state to track download progress percentage */
  const [downloadProgress, setDownloadProgress] = useState<number>(modelManager.getDownloadProgress());

  /* Local state to track the active model configuration */
  const [activeModel, setActiveModel] = useState<ModelConfig>(modelManager.getActiveModel());

  /* Access document store state and clear action */
  const documents = useDocumentStore(state => state.documents);
  const clearDocuments = useDocumentStore(state => state.clearAll);

  /* Access chat store state and clear action */
  const messages = useChatStore(state => state.messages);
  const clearMessages = useChatStore(state => state.clearMessages);

  /* Calculate document statistics */
  const documentCount = documents.length;
  const totalDocSizeKB = documents.reduce((sum, doc) => sum + doc.size, 0) / 1024;
  const totalDocSizeMB = (totalDocSizeKB / 1024).toFixed(2);

  /* Subscribe to model status and progress changes from the manager */
  useEffect(() => {
    /* Check initially if file exists to update status to idle or not_downloaded */
    modelManager.checkModelExists().then(() => {
      setActiveModel(modelManager.getActiveModel());
      setModelStatus(modelManager.getStatus());
    });

    /* Subscribe and return cleanup function */
    const unsubscribeStatus = modelManager.addStatusListener((status) => {
      setModelStatus(status);
    });

    const unsubscribeProgress = modelManager.addProgressListener((progress) => {
      setDownloadProgress(progress);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeProgress();
    };
  }, []);

  /*
   * handleModelSelect — Handles switching the active model configuration
   */
  const handleModelSelect = async (modelId: string) => {
    if (modelStatus === 'ready' || modelStatus === 'loading') {
      Alert.alert(
        'Switch Model',
        'This will unload the current model from memory. Are you sure you want to proceed?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Proceed',
            onPress: async () => {
              const success = await modelManager.setActiveModel(modelId);
              if (success) {
                setActiveModel(modelManager.getActiveModel());
                setModelStatus(modelManager.getStatus());
              }
            },
          },
        ],
      );
    } else {
      const success = await modelManager.setActiveModel(modelId);
      if (success) {
        setActiveModel(modelManager.getActiveModel());
        setModelStatus(modelManager.getStatus());
      }
    }
  };

  /*
   * handleDownloadModel — Triggers downloading the model from Hugging Face
   */
  const handleDownloadModel = () => {
    Alert.alert(
      'Download AI Model',
      `This will download the ${activeModel.name} model (approx. ${activeModel.sizeLabel}) to your device. We recommend connecting to Wi-Fi before proceeding.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            const success = await modelManager.downloadModel();
            if (!success) {
              const err = modelManager.getError();
              Alert.alert('Download Error', err || 'Failed to download model.');
            }
          },
        },
      ],
    );
  };

  /*
   * handleCancelDownload — Cancels the active model download
   */
  const handleCancelDownload = async () => {
    await modelManager.cancelDownload();
    Alert.alert('Cancelled', 'Download has been cancelled.');
  };

  /*
   * handleLoadModel — Triggers loading the model in the background
   */
  const handleLoadModel = async () => {
    if (modelStatus === 'ready' || modelStatus === 'loading') {
      return;
    }
    const success = await modelManager.initializeModel();
    if (!success) {
      const err = modelManager.getError();
      Alert.alert('Load Error', err || 'Failed to load model.');
    }
  };

  /*
   * handleUnloadModel — Releases the model from memory
   */
  const handleUnloadModel = async () => {
    await modelManager.releaseModel();
    Alert.alert('Model Unloaded', 'Model has been released from memory.');
  };

  /*
   * handleClearDocuments — Shows a confirmation dialog before clearing all documents.
   */
  const handleClearDocuments = () => {
    if (documentCount === 0) {
      Alert.alert('Info', 'No documents to clear.');
      return;
    }

    Alert.alert(
      'Clear All Documents',
      'This will permanently delete all stored documents. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            clearDocuments();
            Alert.alert('Cleared', 'All documents have been removed.');
          },
        },
      ],
    );
  };

  /*
   * handleClearChat — Shows a confirmation dialog before clearing chat history.
   */
  const handleClearChat = () => {
    if (messages.length === 0) {
      Alert.alert('Info', 'No chat messages to clear.');
      return;
    }

    Alert.alert(
      'Clear Chat History',
      'This will permanently delete all conversation messages. This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Chat',
          style: 'destructive',
          onPress: () => {
            clearMessages();
            Alert.alert('Cleared', 'Chat history has been cleared.');
          },
        },
      ],
    );
  };

  /* Helper to format model status text and style */
  const getStatusDetails = () => {
    switch (modelStatus) {
      case 'ready':
        return { text: 'Ready ✓', color: COLORS.success, dotColor: COLORS.success };
      case 'loading':
        return { text: 'Loading...', color: COLORS.primary, dotColor: COLORS.primary };
      case 'downloading':
        return { text: `Downloading (${downloadProgress}%)`, color: COLORS.primary, dotColor: COLORS.primary };
      case 'idle':
        return { text: 'Idle (Loaded on demand)', color: COLORS.textSecondary, dotColor: COLORS.border };
      case 'error':
        return { text: 'Error', color: COLORS.error, dotColor: COLORS.error };
      case 'not_downloaded':
      default:
        return { text: 'Not Downloaded', color: COLORS.warning, dotColor: COLORS.warning };
    }
  };

  const statusDetails = getStatusDetails();

  return (
    /* SafeAreaView wraps the screen — edges={['top']} adds padding for status bar */
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with back button — navigates back to Home on press */}
      <Header
        title="Settings"
        subtitle="App configuration"
        showBack={true}
        onBackPress={() => navigation.goBack()} // Pop this screen off the stack
      />

      {/* ScrollView in case content overflows on small screens */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false} // Hide scrollbar for cleaner look
      >
        {/* ─── SELECT AI MODEL CARD ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>⚙️</Text>
            <Text style={styles.cardTitle}>Change Active Model</Text>
          </View>
          <Text style={styles.helperText}>
            Select an offline model from the list below. Active model can be loaded, downloaded, or unloaded in the controller section.
          </Text>

          {modelManager.getModels().map((item) => {
            const isActive = item.id === activeModel.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.modelSelectCard,
                  isActive && styles.modelSelectCardActive,
                ]}
                onPress={() => handleModelSelect(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.modelSelectHeader}>
                  <Text style={[styles.modelSelectName, isActive && styles.modelSelectNameActive]}>
                    {item.name}
                  </Text>
                  <View style={[styles.sizeBadge, isActive && styles.sizeBadgeActive]}>
                    <Text style={[styles.sizeBadgeText, isActive && styles.sizeBadgeActiveText]}>
                      {item.sizeLabel}
                    </Text>
                  </View>
                </View>
                <Text style={styles.modelSelectDesc}>{item.description}</Text>
                <View style={styles.modelSelectFooter}>
                  {isActive ? (
                    <Text style={styles.activeLabel}>✓ Active Model</Text>
                  ) : (
                    <Text style={styles.inactiveLabel}>Tap to switch</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── MODEL INFO CARD ─── */}
        {/* Displays details about the local AI model */}
        <View style={styles.card}>
          {/* Card header row — icon + title */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🤖</Text>
            <Text style={styles.cardTitle}>AI Model Controller</Text>
          </View>

          {/* Individual info rows inside the card */}
          {/* Model name */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Model</Text>
            <Text style={styles.infoValue}>{activeModel.name}</Text>
          </View>

          {/* Model format */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Format</Text>
            <Text style={styles.infoValue}>GGUF</Text>
          </View>

          {/* Runtime engine */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Engine</Text>
            <Text style={styles.infoValue}>llama.cpp</Text>
          </View>

          {/* Model status — shows if the model is loaded or not */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: statusDetails.dotColor }]} />
              <Text style={[styles.statusText, { color: statusDetails.color }]}>
                {statusDetails.text}
              </Text>
            </View>
          </View>

          {/* Model location details */}
          <View style={styles.pathBox}>
            <Text style={styles.pathTitle}>Model Path:</Text>
            <Text style={styles.pathText} numberOfLines={2} ellipsizeMode="middle">
              {modelManager.getModelPath()}
            </Text>
          </View>

          {/* Action buttons or Progress Bar for the model */}
          <View style={styles.buttonRow}>
            {modelStatus === 'not_downloaded' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDownloadModel}
              >
                <Text style={styles.buttonText}>⬇️ Download Model ({activeModel.sizeLabel})</Text>
              </TouchableOpacity>
            )}

            {modelStatus === 'downloading' && (
              <View style={styles.downloadProgressContainer}>
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${downloadProgress}%` }]} />
                </View>
                <Text style={styles.progressPercentText}>{downloadProgress}% Downloaded</Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.unloadButton, { marginTop: SPACING.md }]}
                  onPress={handleCancelDownload}
                >
                  <Text style={styles.buttonText}>❌ Cancel Download</Text>
                </TouchableOpacity>
              </View>
            )}

            {modelStatus === 'idle' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleLoadModel}
              >
                <Text style={styles.buttonText}>🔌 Load Model</Text>
              </TouchableOpacity>
            )}

            {modelStatus === 'loading' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.disabledButton]}
                disabled={true}
              >
                <ActivityIndicator size="small" color={COLORS.textPrimary} />
              </TouchableOpacity>
            )}

            {modelStatus === 'ready' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.unloadButton]}
                onPress={handleUnloadModel}
              >
                <Text style={styles.buttonText}>🔌 Unload Model</Text>
              </TouchableOpacity>
            )}

            {modelStatus === 'error' && (
              <View style={{ flex: 1 }}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={async () => {
                    const exists = await modelManager.checkModelExists();
                    if (exists) {
                      handleLoadModel();
                    } else {
                      handleDownloadModel();
                    }
                  }}
                >
                  <Text style={styles.buttonText}>🔄 Retry Operation</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ─── STORAGE CARD ─── */}
        {/* Displays storage usage information */}
        <View style={styles.card}>
          {/* Card header */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>💾</Text>
            <Text style={styles.cardTitle}>Storage</Text>
          </View>

          {/* Number of stored documents */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Documents</Text>
            <Text style={styles.infoValue}>{documentCount} files</Text>
          </View>

          {/* Total storage used */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Storage Used</Text>
            <Text style={styles.infoValue}>{totalDocSizeMB} MB</Text>
          </View>

          {/* Chat messages stored */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Chat Messages</Text>
            <Text style={styles.infoValue}>{messages.length} messages</Text>
          </View>
        </View>

        {/* ─── BENCHMARKS CARD ─── */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📊</Text>
            <Text style={styles.cardTitle}>Performance Benchmarks</Text>
          </View>
          <Text style={styles.helperText}>
            Verify local AI capabilities by running on-device benchmarks for load time, generation speed (tokens/sec), and search recall accuracy.
          </Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => (navigation as any).navigate('Benchmark')}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>📊 Run Performance Benchmarks</Text>
          </TouchableOpacity>
        </View>

        {/* ─── DEVELOPER TOOLS CARD (DEV BUILD ONLY) ─── */}
        {__DEV__ && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIcon}>🛠️</Text>
              <Text style={styles.cardTitle}>Developer Tools</Text>
            </View>
            <Text style={styles.helperText}>
              Diagnose BM25 search queries, check document chunks, and view exact relevance scores.
            </Text>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => (navigation as any).navigate('DebugRetrieval')}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>🔍 Open Debug Retrieval Screen</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── ABOUT CARD ─── */}
        {/* App info and version */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>ℹ️</Text>
            <Text style={styles.cardTitle}>About</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App</Text>
            <Text style={styles.infoValue}>LegalAI</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>0.1.0</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform</Text>
            <Text style={styles.infoValue}>Android</Text>
          </View>
        </View>

        {/* ─── DANGER ZONE ─── */}
        {/* Destructive actions grouped together with visual warning */}
        <View style={styles.dangerZone}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>

          {/* Clear All Documents button */}
          <TouchableOpacity
            style={styles.dangerButton}
            activeOpacity={0.8}
            onPress={handleClearDocuments}
          >
            <Text style={styles.dangerButtonText}>🗑️ Clear All Documents</Text>
          </TouchableOpacity>

          {/* Clear Chat History button */}
          <TouchableOpacity
            style={[styles.dangerButton, { marginTop: SPACING.md }]}
            activeOpacity={0.8}
            onPress={handleClearChat}
          >
            <Text style={styles.dangerButtonText}>🗑️ Clear Chat History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/*
 * StyleSheet — All styles for the Settings screen.
 * Organized by section (container, cards, info rows, danger zone).
 */
const styles = StyleSheet.create({
  /* Main screen container */
  container: {
    flex: 1,                          // Fill entire screen
    backgroundColor: COLORS.background, // Deep navy
  },

  /* ScrollView content padding */
  scrollContent: {
    padding: SPACING.lg,             // 24px padding all around
    paddingBottom: SPACING.xxl,      // Extra bottom padding for scroll comfort
  },

  /* ─── Card Styles ─── */

  /* Generic card container — used for Model, Storage, and About sections */
  card: {
    backgroundColor: COLORS.surface,   // Slightly lighter navy
    borderRadius: RADIUS.lg,           // 16px rounded corners
    padding: SPACING.lg,              // 24px internal padding
    marginBottom: SPACING.md,          // 16px gap between cards
    borderWidth: 1,                    // Subtle border
    borderColor: COLORS.border,        // Dark navy border
  },

  /* Card header — icon + title in a row */
  cardHeader: {
    flexDirection: 'row',             // Horizontal layout
    alignItems: 'center',            // Vertically centered
    marginBottom: SPACING.md,        // 16px gap before the info rows
    paddingBottom: SPACING.md,       // 16px padding below header
    borderBottomWidth: 1,            // Separator line below header
    borderBottomColor: COLORS.border, // Subtle dark border
  },

  /* Card header icon (emoji) */
  cardIcon: {
    fontSize: 24,                    // Medium emoji size
    marginRight: SPACING.sm,        // 8px gap before title text
  },

  /* Card header title text */
  cardTitle: {
    fontSize: FONTS.subheading,       // 18px
    fontWeight: FONTS.weightSemiBold, // Semi-bold
    color: COLORS.textPrimary,        // White
  },

  /* ─── Info Row Styles ─── */

  /* Single info row — label on left, value on right */
  infoRow: {
    flexDirection: 'row',               // Horizontal layout
    justifyContent: 'space-between',   // Push label left, value right
    alignItems: 'center',             // Vertically centered
    paddingVertical: SPACING.sm,      // 8px top/bottom for breathing room
  },

  /* Left-side label text (e.g., "Model", "Format") */
  infoLabel: {
    fontSize: FONTS.body,              // 16px
    color: COLORS.textSecondary,       // Muted gray-blue
  },

  /* Right-side value text (e.g., "Qwen 2.5 3B", "GGUF") */
  infoValue: {
    fontSize: FONTS.body,              // 16px
    color: COLORS.textPrimary,         // White — stands out more than the label
    fontWeight: FONTS.weightSemiBold,  // Semi-bold for emphasis
  },

  /* ─── Status Badge ─── */

  /* Status indicator row (dot + text) */
  statusBadge: {
    flexDirection: 'row',    // Dot and text side by side
    alignItems: 'center',   // Vertically centered
  },

  /* Small colored dot for status */
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,       // Fully circular
    backgroundColor: COLORS.warning, // Orange — model not yet loaded
    marginRight: SPACING.xs,        // 4px gap before text
  },

  /* Status text (e.g., "Not loaded", "Ready") */
  statusText: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightSemiBold,
  },

  /* Model file path details container */
  pathBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  /* Path label */
  pathTitle: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    fontWeight: FONTS.weightSemiBold,
  },

  /* Path string text */
  pathText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: COLORS.textSecondary,
  },

  /* Button row container */
  buttonRow: {
    marginTop: SPACING.md,
    flexDirection: 'row',
  },

  /* Download progress container */
  downloadProgressContainer: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },

  /* Track background */
  progressBarTrack: {
    height: 8,
    width: '100%',
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    marginBottom: SPACING.xs,
  },

  /* Active progress bar fill */
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },

  /* Progress percentage label */
  progressPercentText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weightRegular,
  },

  /* Main load/unload action button */
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Disabled state for action buttons */
  disabledButton: {
    backgroundColor: COLORS.border,
    opacity: 0.5,
  },

  /* Unload button specific style (darker gray-blue border style) */
  unloadButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.error,
  },

  /* Text inside action buttons */
  buttonText: {
    fontSize: FONTS.body,
    color: COLORS.textPrimary,
    fontWeight: FONTS.weightSemiBold,
  },

  /* ─── Danger Zone Styles ─── */

  /* Danger zone section container */
  dangerZone: {
    marginTop: SPACING.lg,          // 24px gap from the last card
    padding: SPACING.lg,            // 24px internal padding
    backgroundColor: COLORS.surface, // Same card background
    borderRadius: RADIUS.lg,        // 16px rounded corners
    borderWidth: 1,                  // Border for visual grouping
    borderColor: COLORS.error,       // Red border — signals danger
  },

  /* "Danger Zone" heading text */
  dangerTitle: {
    fontSize: FONTS.subheading,       // 18px
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.error,             // Red text — matches the border
    marginBottom: SPACING.md,        // 16px gap before the button
  },

  /* Clear All Documents button */
  dangerButton: {
    backgroundColor: 'rgba(252, 129, 129, 0.15)', // Very subtle red background
    paddingVertical: SPACING.md,    // 16px top/bottom padding
    paddingHorizontal: SPACING.lg,  // 24px left/right padding
    borderRadius: RADIUS.md,        // 12px rounded corners
    alignItems: 'center',          // Center the text horizontally
    borderWidth: 1,
    borderColor: COLORS.error,     // Red border
  },

  /* Button text */
  dangerButtonText: {
    fontSize: FONTS.body,            // 16px
    color: COLORS.error,            // Red text
    fontWeight: FONTS.weightSemiBold,
  },

  /* Helper text for instructions */
  helperText: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 20,
  },

  /* Model selection card styling */
  modelSelectCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modelSelectCardActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.05)', // Subtle gold tint
    borderColor: COLORS.primary, // Gold border
  },
  modelSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  modelSelectName: {
    fontSize: FONTS.body,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.textPrimary,
  },
  modelSelectNameActive: {
    color: COLORS.primary, // Gold
  },
  modelSelectDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  modelSelectFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  sizeBadge: {
    backgroundColor: COLORS.surfaceVariant,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  sizeBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  sizeBadgeText: {
    fontSize: 11,
    fontWeight: FONTS.weightBold,
    color: COLORS.textSecondary,
  },
  sizeBadgeActiveText: {
    color: COLORS.background,
  },
  activeLabel: {
    fontSize: 11,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
  },
  inactiveLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});

/* Export for use in AppNavigator */
export default SettingsScreen;
