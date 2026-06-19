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