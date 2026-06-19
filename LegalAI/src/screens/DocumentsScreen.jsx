/*
 * DocumentsScreen.tsx — Document management screen with upload and list.
 *
 * PURPOSE: Allows users to upload PDF documents from their device,
 * view a list of all uploaded documents, and delete individual documents.
 * Tapping a document navigates to the DocumentDetails screen.
 *
 * DESIGN DECISIONS:
 * - FlatList for the document list — virtualized rendering for performance.
 * - FAB (Floating Action Button) for upload — follows Material Design patterns.
 * - react-native-document-picker for file selection — native file picker UI.
 * - Alert.alert for delete confirmation — native dialog, no custom modal needed.
 * - Empty state with helpful message — guides new users to upload their first PDF.
 *
 * STATE MANAGEMENT:
 * - Documents metadata stored in Zustand (useDocumentStore).
 * - Persisted to AsyncStorage via Zustand's persist middleware.
 * - The actual PDF file stays on the filesystem; we only store the URI.
 *
 * NAVIGATION:
 * - Tapping a document card → DocumentDetails screen (with docId and docName params).
 * - Back button → Home screen.
 */

/* Import React — required for JSX */
import React from 'react';

/* Import RN components */
import {
  View, // Layout container
  Text, // Text rendering
  FlatList, // Virtualized scrollable list
  StyleSheet, // Optimized styles
  TouchableOpacity, // Touchable wrapper
  Alert // Native alert dialog for confirmations
} from 'react-native';

/* SafeAreaView for notch handling */
import { SafeAreaView } from 'react-native-safe-area-context';

/* Navigation hooks for back button and screen navigation */
import { useNavigation } from '@react-navigation/native';

/* NativeStackNavigationProp for typed navigation */


/* Import route types for type-safe navigation */


/*
 * @react-native-documents/picker — Native file picker for selecting files.
 * pick() opens the device's file picker UI.
 * types contains predefined MIME type constants (pdf, images, etc.).
 */
import { pick, keepLocalCopy, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';

/* Import react-native-fs for file clean up */
import RNFS from 'react-native-fs';

/* Import our custom components */
import Header from '../components/Header'; // Screen header
import DocumentCard from '../components/DocumentCard'; // Document list item

/* Import the Zustand document store */
import useDocumentStore from '../store/useDocumentStore';

/* Import the Document type for FlatList typing */


/* Import theme tokens */
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/theme';

/* Type alias for navigation prop — enables type-safe navigation.navigate() calls */


/*
 * DocumentsScreen — The document management screen component.
 *
 * Renders:
 * 1. Header with back button
 * 2. Document count badge
 * 3. FlatList of DocumentCard components
 * 4. FAB for uploading new documents
 * 5. Empty state when no documents exist
 */
const DocumentsScreen = () => {
  /* Typed navigation hook for navigating to DocumentDetails */
  const navigation = useNavigation();

  /*
   * Access the Zustand document store.
   * Each selector subscribes to only the specific piece of state it needs.
   */
  const documents = useDocumentStore((state) => state.documents); // All documents
  const addDocument = useDocumentStore((state) => state.addDocument); // Action to add
  const removeDocument = useDocumentStore((state) => state.removeDocument); // Action to remove

  /*
   * handlePickDocument — Opens the native file picker for PDF selection.
   *
   * Flow:
   * 1. Call pick() to show the native file picker UI
   * 2. User selects a PDF file
   * 3. We get back the file's URI, name, and size
   * 4. Add the document metadata to the Zustand store
   *
   * Error handling:
   * - If user cancels the picker, we silently ignore (no error message)
   * - If an actual error occurs, we show an alert
   */
  const handlePickDocument = async () => {
    try {
      /*
       * pick() opens the native file picker.
       * type: [types.pdf, types.docx, types.plainText] — Support PDFs, DOCX, and TXT files.
       * Returns an array of selected files (we only allow one).
       */
      const result = await pick({
        type: [types.pdf, types.docx, types.plainText]
      });

      /*
       * result is an array of selected files.
       * We take the first one since we only allow single selection.
       * Each result has: uri, name, size, type (MIME type).
       */
      if (result && result.length > 0) {
        const file = result[0]; // Get the first (and only) selected file

        /* Resolve proper fallback extension */
        const fallbackName = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ?
        'document.docx' :
        file.type === 'text/plain' ?
        'document.txt' :
        'document.pdf';

        const finalName = file.name || fallbackName;
        const cleanedName = finalName.replace(/[^a-zA-Z0-9._-]/g, '_');

        /* Use keepLocalCopy from the picker library to copy the file to documentDirectory */
        const copyResult = await keepLocalCopy({
          destination: 'documentDirectory',
          files: [{
            uri: file.uri,
            fileName: `${Date.now()}_${cleanedName}`
          }]
        });

        const localFile = copyResult[0];

        if (localFile.status === 'error') {
          throw new Error(localFile.copyError || 'Failed to obtain local copy of picked file');
        }

        /* Add the document with the local, permission-safe file:// URI to the store */
        addDocument({
          name: finalName, // Use original or fallback file name
          uri: localFile.localUri, // Local file path (starts with file://)
          size: file.size || 0 // File size in bytes (0 if unknown)
        });
      }
    } catch (error) {
      /*
       * Check if the user simply cancelled the picker.
       * @react-native-documents/picker throws an error when cancelled,
       * but we don't want to show an error message for that.
       */
      const isCancel = isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED;
      if (!isCancel) {
        /* Show an alert for actual errors */
        Alert.alert(
          'Upload Failed',
          `Could not upload the document: ${error?.message || error}`
        );
      }
      /* If cancelled, silently do nothing */
    }
  };

  /*
   * handleDeleteDocument — Shows a confirmation dialog before deleting.
   *
   * @param doc — The document to delete.
   *
   * Uses Alert.alert() with destructive styling for the delete button.
   * Removes from the store and also deletes the physical file.
   */
  const handleDeleteDocument = (doc) => {
    Alert.alert(
      'Delete Document', // Dialog title
      `Are you sure you want to delete "${doc.name}"?`, // Message with file name
      [
      { text: 'Cancel', style: 'cancel' }, // Dismiss button
      {
        text: 'Delete',
        style: 'destructive', // Red text on iOS
        onPress: async () => {
          try {
            /* Strip file:// prefix if present to get the raw path */
            const rawPath = doc.uri.startsWith('file://') ? doc.uri.slice(7) : doc.uri;
            const exists = await RNFS.exists(rawPath);
            if (exists) {
              await RNFS.unlink(rawPath);
            }
          } catch (err) {
            console.warn('[DocumentsScreen] Error removing physical file:', err);
          }
          /* Remove the document metadata from our store */
          removeDocument(doc.id);
        }
      }]

    );
  };

  /*
   * renderDocumentItem — FlatList's renderItem callback.
   *
   * Renders each document as a DocumentCard component.
   * Passes the document data and callbacks for press and delete.
   */
  const renderDocumentItem = ({ item }) =>
  <DocumentCard
    document={item}
    onPress={() => {
      /*
       * Navigate to DocumentDetails screen with the document's ID and name.
       * These params are defined in RootStackParamList and are type-checked.
       */
      navigation.navigate('DocumentDetails', {
        docId: item.id, // Pass document ID for data lookup
        docName: item.name // Pass name for the header display
      });
    }}
    onDelete={() => handleDeleteDocument(item)} // Show delete confirmation
  />;


  /*
   * renderEmptyState — Shown when there are no documents uploaded.
   *
   * Provides a welcoming message and prompts the user to upload their first PDF.
   */
  const renderEmptyState = () =>
  <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📂</Text>
      <Text style={styles.emptyTitle}>No documents yet</Text>
      <Text style={styles.emptySubtitle}>
        Upload your first legal document to get started with AI-powered analysis.
      </Text>
      <Text style={styles.emptyHint}>
        Tap the + button below to upload a PDF, DOCX, or TXT
      </Text>
    </View>;


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with back button */}
      <Header
        title="Documents"
        subtitle="Upload and manage PDF, DOCX, TXT files"
        showBack={true}
        onBackPress={() => navigation.goBack()} />
      

      {/* Document count badge — shows how many documents are stored */}
      {documents.length > 0 &&
      <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </Text>
        </View>
      }

      {/*
        * FlatList of documents.
        * Uses DocumentCard for each item, with empty state component.
        */}
      <FlatList
        data={documents} // Document array from Zustand
        renderItem={renderDocumentItem} // Render each as a DocumentCard
        keyExtractor={(item) => item.id} // Unique key from document ID
        contentContainerStyle={styles.listContent} // Padding for the list
        ListEmptyComponent={renderEmptyState} // Empty state when no docs
        showsVerticalScrollIndicator={false} // Hide scrollbar
      />

      {/*
        * FAB (Floating Action Button) — Upload new document.
        * Positioned absolutely in the bottom-right corner.
        * Gold circle with a "+" icon — follows Material Design conventions.
        */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handlePickDocument} // Open file picker
        activeOpacity={0.8} // Slight dim on press
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>);

};

/*
 * Styles for the Documents screen.
 */
const styles = StyleSheet.create({
  /* Main container */
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },

  /* Document count badge container */
  countContainer: {
    paddingHorizontal: SPACING.lg, // 24px left/right
    paddingVertical: SPACING.sm // 8px top/bottom
  },

  /* Count text (e.g., "3 documents") */
  countText: {
    fontSize: FONTS.caption, // 14px
    color: COLORS.textSecondary // Muted gray-blue
  },

  /* FlatList content padding */
  listContent: {
    flexGrow: 1, // Allow list to fill space
    paddingHorizontal: SPACING.lg, // 24px left/right padding
    paddingBottom: 80 // Extra bottom padding to avoid FAB overlap
  },

  /* ─── Empty State ─── */

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl
  },

  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.lg
  },

  emptyTitle: {
    fontSize: FONTS.heading,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center'
  },

  emptySubtitle: {
    fontSize: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.md
  },

  emptyHint: {
    fontSize: FONTS.caption,
    color: COLORS.primary, // Gold — draws attention to the action
    fontWeight: FONTS.weightSemiBold,
    textAlign: 'center'
  },

  /* ─── FAB (Floating Action Button) ─── */

  /* Circular gold button in the bottom-right corner */
  fab: {
    position: 'absolute', // Positioned relative to the screen, not the scroll
    bottom: SPACING.xl, // 32px from bottom
    right: SPACING.lg, // 24px from right
    width: 56, // Standard FAB size
    height: 56,
    borderRadius: RADIUS.full, // Fully circular
    backgroundColor: COLORS.primary, // Gold accent
    justifyContent: 'center', // Center the "+" icon
    alignItems: 'center',
    elevation: 6, // Android shadow — makes the FAB float above content
    shadowColor: '#000', // iOS shadow color
    shadowOffset: { width: 0, height: 3 }, // iOS shadow offset
    shadowOpacity: 0.3, // iOS shadow opacity
    shadowRadius: 4 // iOS shadow blur
  },

  /* "+" icon on the FAB */
  fabIcon: {
    fontSize: 28, // Large "+" symbol
    color: COLORS.background, // Dark on gold background
    fontWeight: FONTS.weightBold // Bold for visibility
  }
});

/* Export for use in AppNavigator */
export default DocumentsScreen;