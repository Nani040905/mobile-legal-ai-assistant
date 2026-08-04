/*
 * useCaseStore.ts — Zustand store for managing case folders.
 *
 * PURPOSE: Manages the collection of CaseFolder records, supporting creation,
 * updates, document mapping, and status tracking. Persisted using secureStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '../services/secureStorage';












































const useCaseStore = create()(
  persist(
    (set, get) => ({
      cases: [],

      addCase: (caseData) => {
        const newCase = {
          ...caseData,
          id: Date.now().toString() + '-' + Math.floor(Math.random() * 1000000).toString(36),
          documents: [],
          tags: [],
          notes: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        set((state) => ({
          cases: [...state.cases, newCase]
        }));
      },

      updateCase: (id, updates) => {
        set((state) => ({
          cases: state.cases.map((c) =>
          c.id === id ?
          { ...c, ...updates, updatedAt: Date.now() } :
          c
          )
        }));
      },

      deleteCase: (id) => {
        set((state) => ({
          cases: state.cases.filter((c) => c.id !== id)
        }));
      },

      addDocumentToCase: (caseId, docId) => {
        set((state) => ({
          cases: state.cases.map((c) => {
            if (c.id === caseId) {
              if (c.documents.includes(docId)) {
                return c;
              }
              return {
                ...c,
                documents: [...c.documents, docId],
                updatedAt: Date.now()
              };
            }
            return c;
          })
        }));
      },

      removeDocumentFromCase: (caseId, docId) => {
        set((state) => ({
          cases: state.cases.map((c) => {
            if (c.id === caseId) {
              return {
                ...c,
                documents: c.documents.filter((id) => id !== docId),
                updatedAt: Date.now()
              };
            }
            return c;
          })
        }));
      },

      addCaseNote: (caseId, text) => {
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  notes: [
                    ...(c.notes || []),
                    {
                      id: Date.now().toString() + '-' + Math.floor(Math.random() * 1000000).toString(36),
                      text,
                      createdAt: Date.now()
                    }
                  ],
                  updatedAt: Date.now()
                }
              : c
          )
        }));
      },

      deleteCaseNote: (caseId, noteId) => {
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  notes: (c.notes || []).filter((n) => n.id !== noteId),
                  updatedAt: Date.now()
                }
              : c
          )
        }));
      },

      toggleCaseTag: (caseId, tag) => {
        set((state) => ({
          cases: state.cases.map((c) => {
            if (c.id === caseId) {
              const currentTags = c.tags || [];
              const newTags = currentTags.includes(tag)
                ? currentTags.filter((t) => t !== tag)
                : [...currentTags, tag];
              return {
                ...c,
                tags: newTags,
                updatedAt: Date.now()
              };
            }
            return c;
          })
        }));
      },

      setCaseStatus: (caseId, status) => {
        set((state) => ({
          cases: state.cases.map((c) =>
          c.id === caseId ?
          { ...c, status, updatedAt: Date.now() } :
          c
          )
        }));
      },

      setNextHearingDate: (caseId, date) => {
        set((state) => ({
          cases: state.cases.map((c) =>
          c.id === caseId ?
          { ...c, nextHearingDate: date, updatedAt: Date.now() } :
          c
          )
        }));
      },

      setTimeline: (caseId, events) => {
        set((state) => ({
          cases: state.cases.map((c) =>
          c.id === caseId ?
          { ...c, timelineEvents: events, updatedAt: Date.now() } :
          c
          )
        }));
      },

      setContradictionReport: (caseId, report) => {
        set((state) => ({
          cases: state.cases.map((c) =>
          c.id === caseId ?
          { ...c, contradictionReport: report, updatedAt: Date.now() } :
          c
          )
        }));
      },

      setEntityIndex: (caseId, entityIndex) => {
        set((state) => ({
          cases: state.cases.map((c) =>
          c.id === caseId ?
          { ...c, entityIndex, updatedAt: Date.now() } :
          c
          )
        }));
      },

      setEvidenceChainReport: (caseId, report) => {
        set((state) => ({
          cases: state.cases.map((c) =>
          c.id === caseId ?
          { ...c, evidenceChainReport: report, updatedAt: Date.now() } :
          c
          )
        }));
      },

      setMissingDocsReport: (caseId, report) => {
        set((state) => ({
          cases: state.cases.map((c) =>
          c.id === caseId ?
          { ...c, missingDocsReport: report, updatedAt: Date.now() } :
          c
          )
        }));
      },

      setHearingBrief: (caseId, report) => {
        set((state) => ({
          cases: state.cases.map((c) =>
          c.id === caseId ?
          { ...c, hearingBrief: report, updatedAt: Date.now() } :
          c
          )
        }));
      },

      setOpponentPrediction: (caseId, report) => {
        set((state) => ({
          cases: state.cases.map((c) =>
          c.id === caseId ?
          { ...c, opponentPrediction: report, updatedAt: Date.now() } :
          c
          )
        }));
      },

      setClientQuestions: (caseId, report) => {
        set((state) => ({
          cases: state.cases.map((c) =>
          c.id === caseId ?
          { ...c, clientQuestions: report, updatedAt: Date.now() } :
          c
          )
        }));
      },

      getCaseById: (id) => {
        return get().cases.find((c) => c.id === id);
      },

      clearAllCases: () => {
        set({ cases: [] });
      }
    }),
    {
      name: 'legal-ai-case-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        cases: state.cases
      })
    }
  )
);

export default useCaseStore;