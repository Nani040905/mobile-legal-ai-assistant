/*
 * retrievalBenchmark.ts — Benchmark suite for the BM25 retrieval engine.
 *
 * PURPOSE: Measures the accuracy, recall, latency, and memory of our local search engine
 * using a set of 50 legal documents and 50 target questions (ground truth).
 *
 * METRICS MEASURED:
 * 1. Recall@5: Proportion of queries where the correct chunk is in the top 5 results.
 * 2. Recall@10: Proportion of queries where the correct chunk is in the top 10 results.
 * 3. MRR (Mean Reciprocal Rank): Measures rank position quality of the first correct chunk.
 * 4. Chunk Precision (P@1): Proportion of queries where the top-1 retrieved result is correct.
 * 5. Latency: Average search latency in milliseconds.
 * 6. Memory: Heap memory usage during search processing.
 */

import { search } from '../services/retrievalService';
import { BENCHMARK_DOCUMENTS } from './benchmarkDocumentsData';
import benchmarkQuestions from './benchmarkQuestions.json';

// Interfaces for our benchmark questions
export interface BenchmarkQuestion {
  id: string;
  documentName: string;
  query: string;
  expectedChunkIndex: number;
  expectedText: string;
}

export interface RetrievalBenchmarkResult {
  totalQueries: number;
  recall5: number;
  recall10: number;
  mrr: number;
  precision: number;
  avgLatencyMs: number;
  peakMemoryMb: number;
  failingQueries: Array<{
    id: string;
    documentName: string;
    query: string;
    rank: number;
    expectedText: string;
    topRetrieved: Array<{
      index: number;
      score: number;
      textPreview: string;
    }>;
  }>;
}

// Chunker function matching pdfService.ts splitIntoChunks algorithm
const splitIntoChunks = (text: string, chunkSize: number = 1000): string[] => {
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let currentPosition = 0;

  while (currentPosition < text.length) {
    let chunk = text.substring(currentPosition, currentPosition + chunkSize);

    if (currentPosition + chunkSize < text.length) {
      const paragraphBreak = chunk.lastIndexOf('\n\n');
      const lineBreak = chunk.lastIndexOf('\n');
      const sentenceEnd = chunk.lastIndexOf('. ');

      if (paragraphBreak > chunkSize * 0.5) {
        chunk = chunk.substring(0, paragraphBreak);
      } else if (lineBreak > chunkSize * 0.5) {
        chunk = chunk.substring(0, lineBreak);
      } else if (sentenceEnd > chunkSize * 0.5) {
        chunk = chunk.substring(0, sentenceEnd + 1);
      }
    }

    chunks.push(chunk.trim());
    currentPosition += chunk.length;

    while (currentPosition < text.length && text[currentPosition] === '\n') {
      currentPosition++;
    }
  }

  return chunks;
};

// Safe memory reader that works in both Node CLI and React Native
const getMemoryBytes = async (): Promise<number> => {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    return process.memoryUsage().heapUsed;
  }
  try {
    // Dynamically require to avoid bundling react-native in CLI Node environment
    const { NativeModules } = require('react-native');
    const { PdfExtractor } = NativeModules;
    if (PdfExtractor && PdfExtractor.getSystemMemoryInfo) {
      const memInfo = await PdfExtractor.getSystemMemoryInfo();
      return memInfo.nativeAllocated;
    }
  } catch (e) {
    // React Native fallback if native module fails
  }
  return 0;
};

/**
 * runFullBenchmark — Main orchestrator executing retrieval verification.
 */
export const runFullBenchmark = async (): Promise<RetrievalBenchmarkResult> => {
  const startMemory = await getMemoryBytes();
  const startTimeTotal = Date.now();

  const questions: BenchmarkQuestion[] = benchmarkQuestions;
  const docCache = new Map<string, string[]>();
  const documentsList = Array.from(new Set(questions.map(q => q.documentName)));

  // Load and chunk documents from static memory
  for (const docName of documentsList) {
    const rawText = BENCHMARK_DOCUMENTS[docName] || '';
    const chunks = splitIntoChunks(rawText);
    docCache.set(docName, chunks);
  }

  let totalQueries = 0;
  let hitsAt1 = 0;
  let hitsAt5 = 0;
  let hitsAt10 = 0;
  let sumRR = 0;
  let totalSearchDurationMs = 0;

  const failingQueriesList: RetrievalBenchmarkResult['failingQueries'] = [];

  for (const q of questions) {
    const chunks = docCache.get(q.documentName) || [];
    
    // Measure latency for this search call
    const startSearch = Date.now();
    const searchResults = search(q.query, chunks, 10);
    const searchDuration = Date.now() - startSearch;
    
    totalSearchDurationMs += searchDuration;
    totalQueries++;

    // Find rank of correct chunk
    let rank = -1;
    for (let i = 0; i < searchResults.length; i++) {
      const retrieved = searchResults[i];
      const isIndexMatch = retrieved.index === q.expectedChunkIndex;
      const isTextMatch = retrieved.chunk.toLowerCase().includes(q.expectedText.toLowerCase());

      if (isIndexMatch || isTextMatch) {
        rank = i + 1;
        break;
      }
    }

    const reciprocalRank = rank > 0 ? 1 / rank : 0;
    if (rank === 1) hitsAt1++;
    if (rank > 0 && rank <= 5) hitsAt5++;
    if (rank > 0 && rank <= 10) hitsAt10++;
    sumRR += reciprocalRank;

    // Track ranking mismatches (Rank > 1 or Not Found)
    if (rank !== 1) {
      failingQueriesList.push({
        id: q.id,
        documentName: q.documentName,
        query: q.query,
        rank,
        expectedText: q.expectedText,
        topRetrieved: searchResults.slice(0, 3).map(r => ({
          index: r.index,
          score: r.score,
          textPreview: r.chunk.substring(0, 80).replace(/\n/g, ' ') + '...'
        }))
      });
    }
  }

  const endMemory = await getMemoryBytes();
  const peakMemoryBytes = Math.max(0, endMemory - startMemory);
  const peakMemoryMb = Number((peakMemoryBytes / (1024 * 1024)).toFixed(2));
  const avgLatencyMs = Number((totalSearchDurationMs / totalQueries).toFixed(2));

  const recall5 = Number(((hitsAt5 / totalQueries) * 100).toFixed(2));
  const recall10 = Number(((hitsAt10 / totalQueries) * 100).toFixed(2));
  const mrr = Number((sumRR / totalQueries).toFixed(3));
  const precision = Number(((hitsAt1 / totalQueries) * 100).toFixed(2));

  return {
    totalQueries,
    recall5,
    recall10,
    mrr,
    precision,
    avgLatencyMs,
    peakMemoryMb,
    failingQueries: failingQueriesList
  };
};

// Auto-run if executed directly via node or ts-node command line
if (typeof require !== 'undefined' && require.main === module) {
  (async () => {
    console.log('================================================================');
    console.log('         LEGAL AI ASSISTANT RETRIEVAL QUALITY BENCHMARK        ');
    console.log('================================================================\n');

    console.log('Running benchmark...');
    const result = await runFullBenchmark();

    console.log('=========================================');
    console.log('           OVERALL SYSTEM SUMMARY        ');
    console.log('=========================================');
    console.log(`Total Queries Evaluated : ${result.totalQueries}`);
    console.log(`Average Recall@5        : ${result.recall5}%`);
    console.log(`Average Recall@10       : ${result.recall10}%`);
    console.log(`Mean Reciprocal Rank    : ${result.mrr}`);
    console.log(`Chunk Precision (P@1)   : ${result.precision}%`);
    console.log(`Average Latency         : ${result.avgLatencyMs} ms`);
    console.log(`Benchmark Memory Delta  : ${result.peakMemoryMb} MB`);
    console.log('=========================================\n');

    if (result.failingQueries.length > 0) {
      console.log(`Found ${result.failingQueries.length} query ranking mismatches.`);
    } else {
      console.log('🎉 Outstanding! All queries resolved inside rank 1!');
    }
  })();
}
