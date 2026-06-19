/*
 * useDocumentStore.ts — Zustand store for managing uploaded documents.
 *
 * PURPOSE: Centralizes all document state (list of uploaded PDFs, their
 * metadata, extracted text) and provides actions to add, remove, and
 * clear documents. Persisted to AsyncStorage so documents survive app restarts.
 *
 * DESIGN DECISIONS:
 * - Same pattern as useChatStore — Zustand + persist middleware.
 * - Documents store metadata only — the actual PDF binary stays on the filesystem.
 *   We store the URI (path) to the file, not the file contents.
 * - Extracted text is stored per-document so we don't re-extract on every app launch.
 * - Chunked text is stored alongside extracted text for Q&A/summarization.
 *
 * STATE:
 * - documents[] — Array of document metadata objects.
 *
 * ACTIONS:
 * - addDocument() — Adds a new document to the store.
 * - removeDocument() — Deletes a document by ID.
 * - updateDocumentText() — Stores extracted text and chunks for a document.
 * - clearAll() — Removes all documents.
 */

/* Import Zustand's create function */
import { create } from 'zustand';

/* Import persist middleware for automatic AsyncStorage persistence */
import { persist, createJSONStorage } from 'zustand/middleware';

/* Import secureStorage — AES encrypted storage adapter */
import { secureStorage } from '../services/secureStorage';

/*
 * Document — TypeScript interface defining a single document's shape.
 *
 * This represents the METADATA about a document, not the file itself.
 * The actual PDF binary is stored on the device's filesystem at the URI.
 */











/*
 * DocumentState — The full Zustand store interface (state + actions).
 */













/*
 * useDocumentStore — The Zustand store hook for document state.
 *
 * Same pattern as useChatStore:
 * - create<DocumentState>() creates a typed store hook
 * - persist() middleware handles AsyncStorage save/load
 * - Components access state with: useDocumentStore(state => state.documents)
 */
const useDocumentStore = create()(
  persist(
    /*
     * Store creator function.
     * `set` updates state, `get` reads current state.
     */
    (set, get) => ({
      /* ─── Initial State ─── */

      /* Empty document array — will be populated from AsyncStorage on rehydration */
      documents: [],

      /* ─── Actions ─── */

      /*
       * addDocument — Adds a new document to the store.
       *
       * @param doc — Document metadata WITHOUT id and uploadedAt (we generate those).
       *
       * Omit<Document, 'id' | 'uploadedAt'> means "a Document but without id and uploadedAt".
       * This is useful because the caller shouldn't need to generate IDs — the store handles that.
       *
       * The id is generated from Date.now() — gives us a unique, chronologically sortable ID.
       * The uploadedAt timestamp records when the document was added.
       */
      addDocument: (doc) => {
        /* Create the full document object with auto-generated id and timestamp */
        const newDocument = {
          ...doc, // Spread the provided fields (name, uri, size)
          id: Date.now().toString() + '-' + Math.floor(Math.random() * 1000000).toString(36), // Generate a unique ID from current timestamp + random suffix
          uploadedAt: new Date().toISOString() // Record the upload time as ISO string
        };

        /* Append the new document to the array immutably */
        set((state) => ({
          documents: [...state.documents, newDocument] // New array with existing docs + new doc
        }));
      },

      /*
       * removeDocument — Removes a document from the store by its ID.
       *
       * @param id — The document's unique identifier.
       *
       * Uses Array.filter() to create a new array excluding the document with the given ID.
       * filter() returns a NEW array — this is the immutable update pattern React/Zustand requires.
       *
       * Note: This only removes the metadata from the store.
       * In Phase 4, we'll also delete the actual PDF file from the filesystem.
       */
      removeDocument: (id) => {
        set((state) => ({
          documents: state.documents.filter((doc) => doc.id !== id) // Keep all docs EXCEPT the one with matching ID
        }));
      },

      /*
       * updateDocumentText — Stores extracted text and chunks for a document.
       *
       * @param id — The document's unique identifier.
       * @param text — The full extracted text from the PDF.
       * @param chunks — The text split into smaller chunks for AI processing.
       *
       * Uses Array.map() to create a new array where only the matching document
       * is updated. All other documents remain unchanged.
       * The spread operator { ...doc, extractedText, chunks } creates a new object
       * with all existing fields plus the updated ones.
       */
      updateDocumentText: (id, text, chunks) => {
        set((state) => ({
          documents: state.documents.map((doc) =>
          doc.id === id ?
          { ...doc, extractedText: text, chunks } // Update matching doc
          : doc // Leave others unchanged
          )
        }));
      },

      /*
       * updateDocumentSummary — Stores an AI-generated summary for a document.
       *
       * @param id — The document's unique identifier.
       * @param summary — The AI-generated summary text.
       *
       * Same pattern as updateDocumentText — map + spread for immutable update.
       */
      updateDocumentSummary: (id, summary) => {
        set((state) => ({
          documents: state.documents.map((doc) =>
          doc.id === id ?
          { ...doc, summary } // Add/update the summary field
          : doc // Leave others unchanged
          )
        }));
      },

      /*
       * getDocumentById — Finds and returns a document by its ID.
       *
       * @param id — The document's unique identifier.
       * @returns The Document object, or undefined if not found.
       *
       * Uses get() to read current state (can't use `state` param in non-set context).
       * Array.find() returns the first matching element, or undefined.
       */
      getDocumentById: (id) => {
        return get().documents.find((doc) => doc.id === id); // Find by ID
      },

      /*
       * clearAll — Removes all documents from the store.
       *
       * Used by the Settings screen "Clear All Documents" button.
       * Sets documents to an empty array — persist middleware saves this automatically.
       */
      clearAll: () => {
        set({ documents: [] }); // Replace with empty array
      }
    }),

    /* ─── Persistence Configuration ─── */
    {
      /* AsyncStorage key for document data */
      name: 'legal-ai-document-storage',

      /* Use secureStorage as the persistence backend */
      storage: createJSONStorage(() => secureStorage),

      /* Persist only the documents array — actions are functions, not serializable */
      partialize: (state) => ({
        documents: state.documents
      })
    }
  )
);

/* Export the hook as default */
export default useDocumentStore;