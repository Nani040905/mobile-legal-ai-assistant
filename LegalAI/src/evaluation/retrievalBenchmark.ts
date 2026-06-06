/*
 * retrievalBenchmark.ts — Benchmark suite for the BM25 retrieval engine.
 *
 * PURPOSE: Measures the accuracy and recall of our local search engine
 * using a set of 10 legal documents and 50 target questions (ground truth).
 *
 * METRICS MEASURED:
 * 1. Recall@5: Proportion of queries where the correct chunk is in the top 5 results.
 * 2. Recall@10: Proportion of queries where the correct chunk is in the top 10 results.
 * 3. MRR (Mean Reciprocal Rank): Measures rank position quality of the first correct chunk.
 * 4. Chunk Precision (P@1): Proportion of queries where the top-1 retrieved result is correct.
 *
 * RUNNING THE BENCHMARK:
 *   npx ts-node src/evaluation/retrievalBenchmark.ts
 */

import fs from 'fs';
import path from 'path';
import { search } from '../services/retrievalService';

// Interfaces for our benchmark questions
interface BenchmarkQuestion {
  id: string;
  documentName: string;
  query: string;
  expectedChunkIndex: number;
  expectedText: string;
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

// Main benchmark runner
const runBenchmark = () => {
  console.log('================================================================');
  console.log('         LEGAL AI ASSISTANT RETRIEVAL QUALITY BENCHMARK        ');
  console.log('================================================================\n');

  const docsDir = path.join(__dirname, 'benchmarkDocuments');
  const questionsPath = path.join(__dirname, 'benchmarkQuestions.json');

  // Load questions
  if (!fs.existsSync(questionsPath)) {
    console.error(`Error: Questions file not found at ${questionsPath}`);
    process.exit(1);
  }

  const questions: BenchmarkQuestion[] = JSON.parse(
    fs.readFileSync(questionsPath, 'utf8')
  );

  console.log(`Loaded ${questions.length} benchmark questions.`);

  // Load and cache documents
  const docCache = new Map<string, string[]>();
  const documentsList = Array.from(new Set(questions.map(q => q.documentName)));

  console.log(`Loading and chunking ${documentsList.length} legal documents...\n`);

  for (const docName of documentsList) {
    const docPath = path.join(docsDir, docName);
    if (!fs.existsSync(docPath)) {
      console.error(`Error: Document file not found at ${docPath}`);
      process.exit(1);
    }
    const rawText = fs.readFileSync(docPath, 'utf8');
    const chunks = splitIntoChunks(rawText);
    docCache.set(docName, chunks);
    console.log(`- ${docName}: Chunked into ${chunks.length} segments`);
  }

  console.log('\nRunning retrieval queries...');

  const results: {
    question: BenchmarkQuestion;
    rank: number; // 1-indexed rank, -1 if not found
    recall5: number;
    recall10: number;
    reciprocalRank: number;
    p1: number;
    retrievedChunks: any[];
  }[] = [];

  // Group metrics by document
  const docMetrics = new Map<string, {
    total: number;
    hitsAt1: number;
    hitsAt5: number;
    hitsAt10: number;
    sumReciprocalRank: number;
  }>();

  for (const q of questions) {
    const chunks = docCache.get(q.documentName) || [];
    
    // Search top-10 chunks using our BM25 engine
    const searchResults = search(q.query, chunks, 10);

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

    const recall5 = (rank > 0 && rank <= 5) ? 1 : 0;
    const recall10 = (rank > 0 && rank <= 10) ? 1 : 0;
    const reciprocalRank = rank > 0 ? 1 / rank : 0;
    const p1 = (rank === 1) ? 1 : 0;

    results.push({
      question: q,
      rank,
      recall5,
      recall10,
      reciprocalRank,
      p1,
      retrievedChunks: searchResults
    });

    // Update document metrics
    if (!docMetrics.has(q.documentName)) {
      docMetrics.set(q.documentName, {
        total: 0,
        hitsAt1: 0,
        hitsAt5: 0,
        hitsAt10: 0,
        sumReciprocalRank: 0
      });
    }
    const stats = docMetrics.get(q.documentName)!;
    stats.total++;
    if (rank === 1) stats.hitsAt1++;
    if (rank > 0 && rank <= 5) stats.hitsAt5++;
    if (rank > 0 && rank <= 10) stats.hitsAt10++;
    stats.sumReciprocalRank += reciprocalRank;
  }

  // Print Per-Document Results Table
  console.log('\n===========================================================================================');
  console.log('                               PER-DOCUMENT RETRIEVAL METRICS                               ');
  console.log('===========================================================================================');
  console.log(
    `${'Document Name'.padEnd(30)} | ${'Queries Run'.padEnd(12)} | ${'Recall@5'.padEnd(10)} | ${'Recall@10'.padEnd(10)} | ${'MRR'.padEnd(10)} | ${'P@1 (Acc)'}`
  );
  console.log('-------------------------------------------------------------------------------------------');

  let totalQueries = 0;
  let totalHitsAt1 = 0;
  let totalHitsAt5 = 0;
  let totalHitsAt10 = 0;
  let totalSumRR = 0;

  for (const [docName, stats] of docMetrics.entries()) {
    const recall5 = (stats.hitsAt5 / stats.total) * 100;
    const recall10 = (stats.hitsAt10 / stats.total) * 100;
    const mrr = stats.sumReciprocalRank / stats.total;
    const p1 = (stats.hitsAt1 / stats.total) * 100;

    totalQueries += stats.total;
    totalHitsAt1 += stats.hitsAt1;
    totalHitsAt5 += stats.hitsAt5;
    totalHitsAt10 += stats.hitsAt10;
    totalSumRR += stats.sumReciprocalRank;

    const docDisplayName = docName.replace('.txt', '').padEnd(30);
    const queriesRun = stats.total.toString().padEnd(12);
    const r5 = `${recall5.toFixed(1)}%`.padEnd(10);
    const r10 = `${recall10.toFixed(1)}%`.padEnd(10);
    const m = mrr.toFixed(3).padEnd(10);
    const p = `${p1.toFixed(1)}%`;

    console.log(`${docDisplayName} | ${queriesRun} | ${r5} | ${r10} | ${m} | ${p}`);
  }

  console.log('===========================================================================================');

  // Compute overall summary metrics
  const avgRecall5 = (totalHitsAt5 / totalQueries) * 100;
  const avgRecall10 = (totalHitsAt10 / totalQueries) * 100;
  const overallMRR = totalSumRR / totalQueries;
  const avgP1 = (totalHitsAt1 / totalQueries) * 100;

  console.log('\n=========================================');
  console.log('           OVERALL SYSTEM SUMMARY        ');
  console.log('=========================================');
  console.log(`Total Queries Evaluated : ${totalQueries}`);
  console.log(`Average Recall@5        : ${avgRecall5.toFixed(2)}%`);
  console.log(`Average Recall@10       : ${avgRecall10.toFixed(2)}%`);
  console.log(`Mean Reciprocal Rank    : ${overallMRR.toFixed(3)}`);
  console.log(`Chunk Precision (P@1)   : ${avgP1.toFixed(2)}%`);
  console.log('=========================================\n');

  // List failing queries (Recall@5 = 0)
  const failedQueries = results.filter(r => r.recall5 === 0);
  if (failedQueries.length > 0) {
    console.log('================================================================');
    console.log('                 RETRIEVAL FAILURE DETAILS (Recall@5 = 0)       ');
    console.log('================================================================');
    for (const f of failedQueries) {
      console.log(`\n[ID: ${f.question.id}] [Doc: ${f.question.documentName}]`);
      console.log(`Query    : "${f.question.query}"`);
      console.log(`Expected : Chunk #${f.question.expectedChunkIndex + 1} (containing "${f.question.expectedText}")`);
      if (f.rank === -1) {
        console.log('Retrieved: None of the top 10 chunks matched expected criteria.');
      } else {
        console.log(`Retrieved: Matched at rank #${f.rank}`);
      }
      console.log('Top Chunks Retrieved:');
      f.retrievedChunks.slice(0, 3).forEach((rc, idx) => {
        console.log(`  Rank ${idx + 1} [Chunk ${rc.index + 1}] (Score: ${rc.score.toFixed(2)}): "${rc.chunk.substring(0, 80).replace(/\n/g, ' ')}..."`);
      });
    }
    console.log('================================================================\n');
  } else {
    console.log('🎉 Outstanding! All queries resolved inside the top 5 search results!');
  }
};

runBenchmark();
