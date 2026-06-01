# Document Processing Strategy

## Problem

Large legal documents can exceed the model context window.

Example:

- 50 page agreement
- 100 page case file
- 200 page legal notice collection

Sending the entire document to the model is not practical.

---

## Solution

### Upload

PDF
    ↓
Extract Text
    ↓
Split Into Chunks
    ↓
Store Chunks Locally

---

## Summarization

Chunks
    ↓
Summarize Each Chunk
    ↓
Combine Summaries
    ↓
Final Summary

---

## Question Answering

Question
    ↓
Find Relevant Chunks
    ↓
Send Chunks + Question
    ↓
LLM
    ↓
Answer

---

## Benefits

- Faster
- Lower memory usage
- Works with large PDFs
- Fully offline

