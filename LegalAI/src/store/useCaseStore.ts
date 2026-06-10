/*
 * useCaseStore.ts — Zustand store for managing case folders.
 *
 * PURPOSE: Manages the collection of CaseFolder records, supporting creation,
 * updates, document mapping, and status tracking. Persisted using secureStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '../services/secureStorage';
import { CaseType } from '../types/caseType';

export type CaseStatus =
  | 'consultation'
  | 'notice_sent'
  | 'filing'
  | 'pending'
  | 'evidence'
  | 'arguments'
  | 'disposed';

export interface CaseFolder {
  id: string;
  title: string;              // e.g. "State vs Ramesh"
  caseNumber: string;
  court: string;
  judgeName?: string;         // Optional — judge assigned to the case
  clientName: string;
  caseType: CaseType;
  status: CaseStatus;         // Current phase
  nextHearingDate?: string;   // YYYY-MM-DD format
  documents: string[];        // Array of document IDs from useDocumentStore
  createdAt: number;
  updatedAt: number;
}

interface CaseState {
  cases: CaseFolder[];
  addCase: (
    caseData: Omit<CaseFolder, 'id' | 'documents' | 'createdAt' | 'updatedAt'>
  ) => void;
  updateCase: (id: string, updates: Partial<Omit<CaseFolder, 'id' | 'createdAt' | 'updatedAt'>>) => void;
  deleteCase: (id: string) => void;
  addDocumentToCase: (caseId: string, docId: string) => void;
  removeDocumentFromCase: (caseId: string, docId: string) => void;
  setCaseStatus: (caseId: string, status: CaseStatus) => void;
  setNextHearingDate: (caseId: string, date: string | undefined) => void;
  getCaseById: (id: string) => CaseFolder | undefined;
  clearAllCases: () => void;
}

const useCaseStore = create<CaseState>()(
  persist(
    (set, get) => ({
      cases: [],

      addCase: (caseData) => {
        const newCase: CaseFolder = {
          ...caseData,
          id: Date.now().toString(),
          documents: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          cases: [...state.cases, newCase],
        }));
      },

      updateCase: (id, updates) => {
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === id
              ? { ...c, ...updates, updatedAt: Date.now() }
              : c
          ),
        }));
      },

      deleteCase: (id) => {
        set((state) => ({
          cases: state.cases.filter((c) => c.id !== id),
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
                updatedAt: Date.now(),
              };
            }
            return c;
          }),
        }));
      },

      removeDocumentFromCase: (caseId, docId) => {
        set((state) => ({
          cases: state.cases.map((c) => {
            if (c.id === caseId) {
              return {
                ...c,
                documents: c.documents.filter((id) => id !== docId),
                updatedAt: Date.now(),
              };
            }
            return c;
          }),
        }));
      },

      setCaseStatus: (caseId, status) => {
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? { ...c, status, updatedAt: Date.now() }
              : c
          ),
        }));
      },

      setNextHearingDate: (caseId, date) => {
        set((state) => ({
          cases: state.cases.map((c) =>
            c.id === caseId
              ? { ...c, nextHearingDate: date, updatedAt: Date.now() }
              : c
          ),
        }));
      },

      getCaseById: (id) => {
        return get().cases.find((c) => c.id === id);
      },

      clearAllCases: () => {
        set({ cases: [] });
      },
    }),
    {
      name: 'legal-ai-case-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        cases: state.cases,
      }),
    }
  )
);

export default useCaseStore;
