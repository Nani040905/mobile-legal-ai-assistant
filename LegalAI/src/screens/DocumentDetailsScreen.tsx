/*
 * DocumentDetailsScreen.tsx — Screen for performing actions on a single uploaded PDF.
 *
 * PURPOSE: Provides details about a selected document (name, size, date) and allows
 * users to generate a summary of the document or ask questions about its content.
 *
 * DESIGN DECISIONS:
 * - Tab or sections layout for Summary and Q&A to keep the UI clean and structured.
 * - Simple TextInput and send button for Q&A, mimicking the chat screen but scoped to the doc.
 * - ScrollView allows users to read long summaries and Q&A threads easily.
 * - Loading indicators are shown when generating summaries or answering questions.
 * - Persists summaries and question-answers inside the document store.
 */

/* Import React and hooks for managing local component state and life cycle */
import React, { useState, useEffect } from 'react';

/* Import standard React Native components for structure, scroll, input, and touch feedback */
import {
  View,             // Basic container for views
  Text,             // Text display wrapper
  StyleSheet,       // Native style wrapper
  ScrollView,       // Scrollable container for long content
  TouchableOpacity, // Button-like component with touch feedback
  TextInput,        // Input text field for asking questions
  ActivityIndicator, // Loading spinner
  Alert,            // Native alert dialogs for error display
} from 'react-native';

/* SafeAreaView wraps components to avoid hardware notches and status bar overlapping */
import { SafeAreaView } from 'react-native-safe-area-context';

/* useNavigation is a hook that gives access to the navigation object */
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

/* NativeStackNavigationProp is the TypeScript type for stack navigation actions */
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

/* RootStackParamList defines the parameter types for each screen/route */
import { RootStackParamList } from '../navigation/AppNavigator';

/* Import our reusable Header component for custom navigation header */
import Header from '../components/Header';

/* Import our custom document store containing documents state and actions */
import useDocumentStore, { Document } from '../store/useDocumentStore';

/* Import our LLM service for summarization, answering questions, and status check */
import { generateSummary, answerQuestion, isModelReady } from '../services/llmService';

/* Import our PDF service for extraction and chunking */
import { extractText, splitIntoChunks } from '../services/pdfService';

/* Import our BM25 retrieval service for matching relevant chunks and citation types */
import { getRelevantContext, search, CitationSource } from '../services/retrievalService';

/* Import our answer verifier service to check for hallucinations */
import { verifyAnswer, VerificationResult } from '../services/answerVerifier';

/* Import our custom CitationPanel component */
import { CitationPanel } from '../components/CitationPanel';

/* Import the theme style constants (COLORS, FONTS, SPACING, RADIUS) */
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

/* Define the route prop type specifically for the DocumentDetails screen */
type DocumentDetailsRouteProp = RouteProp<RootStackParamList, 'DocumentDetails'>;

/* Define the navigation prop type for the stack navigation actions */
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DocumentDetails'>;

/*
 * DocumentDetailsScreen functional component.
 * Allows summarizing and asking questions about a specific PDF.
 */
const DocumentDetailsScreen: React.FC = () => {
  /* Get the navigation object for screen transitions */
  const navigation = useNavigation<NavigationProp>();

  /* Get the route object to access parameters passed to this screen */
  const route = useRoute<DocumentDetailsRouteProp>();

  /* Destructure docId and docName parameters from the route object */
  const { docId, docName } = route.params;

  /* Access the store selectors for finding, updating text/chunks, and updating summary */
  const getDocumentById = useDocumentStore(state => state.getDocumentById);
  const updateDocumentText = useDocumentStore(state => state.updateDocumentText);
  const updateDocumentSummary = useDocumentStore(state => state.updateDocumentSummary);

  /* Retrieve the current document object from store using the ID parameter */
  const document = getDocumentById(docId);

  /* Local state to track active tab ('summary' or 'qa') */
  const [activeTab, setActiveTab] = useState<'summary' | 'qa'>('summary');

  /* Local state to track if we are currently extracting text from PDF */
  const [isExtracting, setIsExtracting] = useState(false);

  /* Local state to track if we are currently generating a summary */
  const [isSummarizing, setIsSummarizing] = useState(false);

  /* Local state to track if we are currently processing a question */
  const [isAsking, setIsAsking] = useState(false);

  /* Local state to hold the question input text */
  const [question, setQuestion] = useState('');

  /* Local state to hold the answered output text */
  const [answer, setAnswer] = useState('');

  /* Local states to hold real-time streaming tokens from the local LLM */
  const [streamingSummary, setStreamingSummary] = useState('');
  const [streamingAnswer, setStreamingAnswer] = useState('');

  /* Local state to hold the answer verification result */
  const [verification, setVerification] = useState<VerificationResult | null>(null);

  /* Local state to hold the citation sources matched */
  const [citations, setCitations] = useState<CitationSource[]>([]);

  /*
   * useEffect to trigger PDF text extraction automatically on mount if not already done.
   * This simulates processing the PDF and splitting it into chunks for indexing.
   */
  useEffect(() => {
    /* If the document exists but text has not been extracted yet, extract it */
    if (document && !document.extractedText) {
      /* Define self-invoking async function inside useEffect for async/await usage */
      const performExtraction = async () => {
        /* Set extracting loading state to true to block user actions */
        setIsExtracting(true);
        try {
          /* Extract text from the PDF file URI using PDF service stub */
          const text = await extractText(document.uri);
          /* Split the extracted text into smaller token-friendly chunks */
          const chunks = splitIntoChunks(text);
          /* Update the store with the extracted text and chunks */
          updateDocumentText(docId, text, chunks);
        } catch (error: any) {
          /* Show error alert if extraction fails */
          Alert.alert('Extraction Error', `Failed to extract text from PDF document: ${error?.message || error}`);
        } finally {
          /* Set extracting loading state to false once finished */
          setIsExtracting(false);
        }
      };
      /* Call the async extraction function */
      performExtraction();
    }
  }, [document, docId, updateDocumentText]);

  /* If the document is not found, render fallback text */
  if (!document) {
    return (
      /* Safe area wrapper with top edge offset */
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Custom Header with back arrow to go back to Documents list */}
        <Header title="Error" showBack={true} onBackPress={() => navigation.goBack()} />
        {/* Error message view */}
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Document not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * handleGenerateSummary — Calls LLM summary generator.
   * Summarizes the extracted document text.
   */
  const handleGenerateSummary = async () => {
    /* Step 1: Check if the AI model is loaded and ready */
    if (!isModelReady()) {
      Alert.alert(
        'AI Model Not Loaded',
        'The local AI model is not loaded yet. Please go to Settings and tap "Load Model" first to enable offline summaries.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => navigation.navigate('Settings') }
        ]
      );
      return;
    }

    /* If document has no text extracted, prevent summarization */
    if (!document.extractedText) {
      Alert.alert('Error', 'Please wait for text extraction to complete.');
      return;
    }

    /* Set summarizing loading state to true and reset streaming state */
    setIsSummarizing(true);
    setStreamingSummary('');
    try {
      /* Call the AI summary service with a callback that appends tokens */
      const summaryText = await generateSummary(
        document.extractedText,
        ({ token }) => {
          setStreamingSummary(prev => prev + token);
        }
      );
      /* Store the generated summary in the document store */
      updateDocumentSummary(docId, summaryText);
    } catch (error: any) {
      /* Display error dialog if summarization fails */
      Alert.alert('Summarization Error', error?.message || 'Failed to generate summary.');
    } finally {
      /* Set summarizing loading state to false and clear streaming state */
      setIsSummarizing(false);
      setStreamingSummary('');
    }
  };

  /*
   * handleAskQuestion — Calls LLM question answering model.
   * Answers a specific question using document context.
   */
  const handleAskQuestion = async () => {
    /* If question input is blank, do nothing */
    if (!question.trim()) {
      return;
    }

    /* Step 1: Check if the AI model is loaded and ready */
    if (!isModelReady()) {
      Alert.alert(
        'AI Model Not Loaded',
        'The local AI model is not loaded yet. Please go to Settings and tap "Load Model" first to ask questions.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Settings', onPress: () => navigation.navigate('Settings') }
        ]
      );
      return;
    }

    /* If text is not extracted yet, we cannot perform question answering */
    if (!document.extractedText) {
      Alert.alert('Error', 'Please wait for text extraction to complete.');
      return;
    }

    /* Set asking loading state to true */
    setIsAsking(true);
    /* Clear any previous answer, streaming state, verification, and citations while loading */
    setAnswer('');
    setStreamingAnswer('');
    setVerification(null);
    setCitations([]);

    try {
      /*
       * RAG Step: Retrieve the most relevant chunks using BM25.
       * document.chunks is passed to retrieve the top 3 relevant sections.
       */
      const retrievedChunks = search(
        question,
        document.chunks || []
      );

      /* Build citations array from matched search results */
      const citationResults: CitationSource[] = retrievedChunks.map(r => ({
        documentId: docId,
        documentName: docName,
        chunkIndex: r.index,
        text: r.chunk,
        score: r.score
      }));
      setCitations(citationResults);

      /* Format the relevant context string for the LLM */
      const relevantContext = retrievedChunks.length === 0
        ? 'No relevant information found in the document for this query.'
        : retrievedChunks
            .map(r => `[Chunk ${r.index + 1}]:\n${r.chunk}`)
            .join('\n\n---\n\n');

      /* Call the AI Q&A service with the user's question, retrieved context, and streaming callback */
      const answerText = await answerQuestion(
        question,
        relevantContext,
        ({ token }) => {
          setStreamingAnswer(prev => prev + token);
        }
      );
      /* Store the final answer in the component's state to display */
      setAnswer(answerText);

      /* Compute hallucination verification based on the answer and search results */
      const sourceTexts = retrievedChunks.map(r => r.chunk);
      const verResult = verifyAnswer(answerText, sourceTexts);
      setVerification(verResult);
    } catch (error: any) {
      /* Alert user of failures */
      Alert.alert('Error', error?.message || 'Failed to generate answer for your question.');
    } finally {
      /* Set asking loading state to false and clear streaming state */
      setIsAsking(false);
      setStreamingAnswer('');
    }
  };

  return (
    /* SafeAreaView fills container and avoids notches */
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header bar with back button support */}
      <Header
        title={docName}
        subtitle="Document Actions"
        showBack={true}
        onBackPress={() => navigation.goBack()}
      />

      {/* Renders file metadata (size, chunks) and extraction loading state */}
      <View style={styles.metaCard}>
        {/* Row showing file details */}
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>File Size:</Text>
          <Text style={styles.metaValue}>{(document.size / 1024).toFixed(1)} KB</Text>
        </View>
        {/* Row showing chunk counts if text is extracted */}
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Text status:</Text>
          {isExtracting ? (
            /* Show extraction loader indicator */
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={COLORS.primary} style={styles.smallLoader} />
              <Text style={styles.extractingText}>Extracting text...</Text>
            </View>
          ) : document.extractedText ? (
            /* Show text extracted success status badge */
            <Text style={[styles.metaValue, { color: COLORS.success }]}>
              Extracted ({document.chunks?.length || 0} chunks)
            </Text>
          ) : (
            /* Show pending status */
            <Text style={styles.metaValue}>Pending</Text>
          )}
        </View>
      </View>

      {/* Tabs navigation panel ('Summary' vs 'Ask AI') */}
      <View style={styles.tabBar}>
        {/* Summary Tab Button */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'summary' && styles.activeTabButton]}
          onPress={() => setActiveTab('summary')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'summary' && styles.activeTabText]}>
            Summary
          </Text>
        </TouchableOpacity>
        {/* Q&A Tab Button */}
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'qa' && styles.activeTabButton]}
          onPress={() => setActiveTab('qa')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'qa' && styles.activeTabText]}>
            Ask AI
          </Text>
        </TouchableOpacity>
        {/* Legal Audit Button — navigates to dedicated screen */}
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => navigation.navigate('RiskReport', { docId, docName })}
          activeOpacity={0.8}
          disabled={!document.extractedText || isExtracting}
        >
          <Text style={[styles.tabText, { color: document.extractedText ? COLORS.primary : COLORS.textMuted }]}>
            ⚖️ Audit
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable content section dependent on the active tab */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'summary' ? (
          /* Render summary container content */
          <View style={styles.tabContent}>
            {document.summary || streamingSummary ? (
              /* Show generated summary or streaming summary */
              <View style={styles.summaryBox}>
                <Text style={styles.summaryTitle}>Document Summary</Text>
                <Text style={styles.summaryText}>{streamingSummary || document.summary}</Text>
              </View>
            ) : (
              /* Render Generate Summary Call-to-Action */
              <View style={styles.ctaBox}>
                <Text style={styles.ctaIcon}>📝</Text>
                <Text style={styles.ctaTitle}>No summary generated yet</Text>
                <Text style={styles.ctaSubtitle}>
                  Analyze the document text and generate a structured overview offline.
                </Text>
                {/* Generate Summary Action Button */}
                <TouchableOpacity
                  style={[styles.actionButton, isSummarizing && styles.disabledButton]}
                  onPress={handleGenerateSummary}
                  disabled={isSummarizing || isExtracting || !document.extractedText}
                  activeOpacity={0.8}
                >
                  {isSummarizing ? (
                    /* Show spinner inside summary button */
                    <ActivityIndicator size="small" color={COLORS.background} />
                  ) : (
                    /* Show button text */
                    <Text style={styles.actionButtonText}>Generate Summary</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          /* Render Q&A container content */
          <View style={styles.tabContent}>
            <View style={styles.qaContainer}>
              <Text style={styles.sectionLabel}>Ask a question about this document:</Text>
              {/* Question text input and submit row */}
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., What are the important dates?"
                  placeholderTextColor={COLORS.textMuted}
                  value={question}
                  onChangeText={setQuestion}
                  editable={!isAsking && !isExtracting && !!document.extractedText}
                />
                {/* Ask Button */}
                <TouchableOpacity
                  style={[
                    styles.askButton,
                    (!question.trim() || isAsking || !document.extractedText) && styles.disabledButton
                  ]}
                  onPress={handleAskQuestion}
                  disabled={!question.trim() || isAsking || !document.extractedText}
                  activeOpacity={0.8}
                >
                  {isAsking ? (
                    /* Activity spinner */
                    <ActivityIndicator size="small" color={COLORS.background} />
                  ) : (
                    /* Send arrow */
                    <Text style={styles.askButtonText}>Ask</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Show the output answer if it exists or is streaming */}
              {answer || streamingAnswer ? (
                <View style={styles.answerBox}>
                  <Text style={styles.answerTitle}>AI Response</Text>
                  <Text style={styles.answerText}>{streamingAnswer || answer}</Text>

                  {/* Hallucination warning banner */}
                  {verification && verification.confidence < 0.5 && (
                    <View style={styles.warningBanner}>
                      <Text style={styles.warningText}>
                        ⚠ Unable to fully verify answer from uploaded documents
                      </Text>
                    </View>
                  )}

                  {/* Citation Sources Panel */}
                  {citations && citations.length > 0 && (
                    <CitationPanel
                      citations={citations}
                      onCitationPress={(citation) => {
                        Alert.alert(
                          `${citation.documentName} — Chunk ${citation.chunkIndex + 1}`,
                          citation.text.trim(),
                          [{ text: 'Close', style: 'cancel' }]
                        );
                      }}
                    />
                  )}
                </View>
              ) : isAsking ? (
                /* Show thinking/parsing message */
                <View style={styles.thinkingBox}>
                  <ActivityIndicator size="small" color={COLORS.primary} style={styles.smallLoader} />
                  <Text style={styles.thinkingText}>Analyzing document text...</Text>
                </View>
              ) : (
                /* Show initial instructions */
                <View style={styles.qaPlaceholder}>
                  <Text style={styles.qaPlaceholderIcon}>🙋‍♀️</Text>
                  <Text style={styles.qaPlaceholderText}>Results will show up here</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

/* Styles definitions */
const styles = StyleSheet.create({
  /* Screen wrapper */
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /* Error state alignment layout */
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Error text styling */
  errorText: {
    fontSize: FONTS.body,
    color: COLORS.error,
  },

  /* Document metadata card */
  metaCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  /* Grid layout for meta records */
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },

  /* Left-side label styling */
  metaLabel: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
  },

  /* Right-side value styling */
  metaValue: {
    fontSize: FONTS.caption,
    color: COLORS.textPrimary,
    fontWeight: FONTS.weightSemiBold,
  },

  /* Status layout alignment */
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  /* Extraction text styling */
  extractingText: {
    fontSize: FONTS.caption,
    color: COLORS.primary,
    fontWeight: FONTS.weightSemiBold,
  },

  /* Small spinner style */
  smallLoader: {
    marginRight: SPACING.xs,
  },

  /* Tabs selection bar container */
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  /* Single tab button layout */
  tabButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },

  /* Underline indicating active selected tab */
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },

  /* Tab text styles */
  tabText: {
    fontSize: FONTS.body,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weightSemiBold,
  },

  /* Highlight text when selected */
  activeTabText: {
    color: COLORS.primary,
  },

  /* Inner scrollable area spacing */
  scrollContent: {
    padding: SPACING.lg,
  },

  /* Tab body alignment container */
  tabContent: {
    flex: 1,
  },

  /* Call-to-action layout when no summary is yet prepared */
  ctaBox: {
    alignItems: 'center',
    padding: SPACING.xl,
  },

  /* Giant decorative emoji */
  ctaIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },

  /* Title explaining task state */
  ctaTitle: {
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },

  /* Explanatory text descriptions */
  ctaSubtitle: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },

  /* Accent action buttons (e.g., summarize) */
  actionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    width: '100%',
  },

  /* Button text formatting */
  actionButtonText: {
    color: COLORS.background,
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
  },

  /* Disabled button style */
  disabledButton: {
    opacity: 0.5,
  },

  /* Container card for summary results */
  summaryBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  /* Header of summary details */
  summaryTitle: {
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },

  /* Text inside summary box */
  summaryText: {
    fontSize: FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },

  /* Question answering layout box */
  qaContainer: {
    flex: 1,
  },

  /* General instruction text label */
  sectionLabel: {
    fontSize: FONTS.caption,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },

  /* Input row grouping field + submit button */
  inputRow: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },

  /* Question input field */
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.body,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },

  /* Ask button style */
  askButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Ask button text styling */
  askButtonText: {
    color: COLORS.background,
    fontSize: FONTS.body,
    fontWeight: FONTS.weightBold,
  },

  /* Rendered answer container */
  answerBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.md,
  },

  /* AI response header */
  answerTitle: {
    fontSize: FONTS.subheading,
    fontWeight: FONTS.weightBold,
    color: COLORS.primary,
    marginBottom: SPACING.md,
  },

  /* Answer body response text */
  answerText: {
    fontSize: FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },

  /* Placeholder QA view */
  qaPlaceholder: {
    alignItems: 'center',
    padding: SPACING.xxl,
  },

  /* Placeholder emoji */
  qaPlaceholderIcon: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },

  /* Placeholder instruction label */
  qaPlaceholderText: {
    fontSize: FONTS.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  /* Analyzing loader container */
  thinkingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },

  /* Loading helper description */
  thinkingText: {
    fontSize: FONTS.caption,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },

  /* Hallucination warning banner container */
  warningBanner: {
    backgroundColor: 'rgba(246, 173, 85, 0.12)', // Transparent warning color
    borderWidth: 1,
    borderColor: COLORS.warning,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginTop: SPACING.md,
  },

  /* Warning text styling */
  warningText: {
    color: COLORS.warning,
    fontSize: FONTS.caption,
    fontWeight: FONTS.weightSemiBold,
  },
});

/* Export DocumentDetailsScreen for navigator initialization */
export default DocumentDetailsScreen;
