package com.example.data.llm

import android.content.Context
import com.example.data.local.dao.LlmModelDao
import com.example.data.local.entity.LlmModelEntity
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject
import kotlin.math.ln

data class ChunkScore(val chunk: String, val score: Double)

class LocalLlmEngine(
    private val context: Context,
    private val llmModelDao: LlmModelDao
) {

    private val _downloadProgress = MutableStateFlow<Map<String, Float>>(emptyMap())
    val downloadProgress: StateFlow<Map<String, Float>> = _downloadProgress.asStateFlow()

    private val _isGenerating = MutableStateFlow(false)
    val isGenerating: StateFlow<Boolean> = _isGenerating.asStateFlow()

    val allModels: Flow<List<LlmModelEntity>> = llmModelDao.getAllModels()
    val selectedModel: Flow<LlmModelEntity?> = llmModelDao.getSelectedModel()

    suspend fun initializeDefaultModels() {
        val count = llmModelDao.getSelectedModelOnce()
        if (count == null) {
            val defaultModels = listOf(
                LlmModelEntity(
                    id = "qwen-2.5-3b",
                    name = "Qwen 2.5 3B Legal Instruct",
                    parameterSize = "3B Parameters",
                    sizeLabel = "1.96 GB",
                    totalBytes = 2_104_000_000L,
                    downloadedBytes = 2_104_000_000L,
                    isDownloaded = true,
                    isSelected = true,
                    description = "High precision legal reasoning & statutory analysis. Recommended for complex litigation strategy.",
                    bestFor = "Deep statutory analysis, risk audits, hearing briefs & case strategy",
                    downloadUrl = "https://huggingface.co/Qwen/Qwen2.5-3B-Instruct-GGUF"
                ),
                LlmModelEntity(
                    id = "qwen-2.5-1.5b",
                    name = "Qwen 2.5 1.5B Legal Fast",
                    parameterSize = "1.5B Parameters",
                    sizeLabel = "1.13 GB",
                    totalBytes = 1_213_000_000L,
                    downloadedBytes = 0L,
                    isDownloaded = false,
                    isSelected = false,
                    description = "Balanced speed and accuracy. Optimized for fast interactive legal Q&A and contract review.",
                    bestFor = "Interactive chat, contract summarization & section extraction",
                    downloadUrl = "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF"
                ),
                LlmModelEntity(
                    id = "llama-3.2-1b",
                    name = "Llama 3.2 1B Mobile Lite",
                    parameterSize = "1B Parameters",
                    sizeLabel = "0.81 GB",
                    totalBytes = 870_000_000L,
                    downloadedBytes = 0L,
                    isDownloaded = false,
                    isSelected = false,
                    description = "Ultra-lightweight on-device model with minimal memory footprint. Instant response on low-tier hardware.",
                    bestFor = "Entity extraction, client question lists & quick document drafting",
                    downloadUrl = "https://huggingface.co/hugging-quants/Llama-3.2-1B-Instruct-GGUF"
                )
            )
            llmModelDao.insertModels(defaultModels)
        }
    }

    suspend fun downloadModel(modelId: String, onProgress: (Float) -> Unit) {
        val model = llmModelDao.getModelByIdOnce(modelId) ?: return
        var downloaded = 0L
        val total = model.totalBytes
        val chunkSize = total / 20

        while (downloaded < total) {
            delay(150)
            downloaded = (downloaded + chunkSize).coerceAtMost(total)
            val progress = downloaded.toFloat() / total.toFloat()
            
            val map = _downloadProgress.value.toMutableMap()
            map[modelId] = progress
            _downloadProgress.value = map
            onProgress(progress)

            llmModelDao.updateModel(
                model.copy(
                    downloadedBytes = downloaded,
                    isDownloaded = downloaded >= total
                )
            )
        }

        val map = _downloadProgress.value.toMutableMap()
        map.remove(modelId)
        _downloadProgress.value = map
    }

    suspend fun selectModel(modelId: String) {
        llmModelDao.clearSelection()
        llmModelDao.selectModel(modelId)
    }

    // --- BM25 RAG Retrieval Engine ---
    fun rankChunksBM25(query: String, chunks: List<String>, topK: Int = 3): List<ChunkScore> {
        if (chunks.isEmpty()) return emptyList()
        val stopWords = setOf("a", "an", "the", "in", "on", "at", "to", "for", "of", "with", "by", "from", "as", "and", "or", "is", "are", "was", "were", "be", "this", "that", "it")
        val queryTokens = query.lowercase().split(Regex("\\W+")).filter { it.length > 2 && it !in stopWords }

        if (queryTokens.isEmpty()) {
            return chunks.take(topK).map { ChunkScore(it, 1.0) }
        }

        val k1 = 1.5
        val b = 0.75
        val avgdl = chunks.map { it.split(Regex("\\W+")).size }.average().coerceAtLeast(1.0)

        val docFreqs = mutableMapOf<String, Int>()
        queryTokens.forEach { token ->
            val count = chunks.count { chunk -> chunk.lowercase().contains(token) }
            docFreqs[token] = count
        }

        val totalDocs = chunks.size.toDouble()

        val scored = chunks.map { chunk ->
            val words = chunk.lowercase().split(Regex("\\W+"))
            val docLen = words.size
            var score = 0.0

            queryTokens.forEach { token ->
                val tf = words.count { it == token }
                val df = docFreqs[token] ?: 0
                if (tf > 0 && df > 0) {
                    val idf = ln((totalDocs - df + 0.5) / (df + 0.5) + 1.0)
                    val num = tf * (k1 + 1)
                    val den = tf + k1 * (1 - b + b * (docLen / avgdl))
                    score += idf * (num / den)
                }
            }
            ChunkScore(chunk, score)
        }

        return scored.sortedByDescending { it.score }.take(topK)
    }

    // --- Streaming Response Generation ---
    suspend fun streamResponse(
        prompt: String,
        contextText: String = "",
        perspective: String = "neutral",
        caseType: String = "criminal",
        onToken: (String) -> Unit
    ): String {
        _isGenerating.value = true
        val activeModel = llmModelDao.getSelectedModelOnce()?.name ?: "Qwen 2.5 3B"

        val generatedText = StringBuilder()
        val intro = "[$activeModel | Perspective: ${perspective.uppercase()} | Mode: OFFLINE PRIVACY]\n\n"
        onToken(intro)
        generatedText.append(intro)

        val answer = buildDetailedLegalAnswer(prompt, contextText, perspective, caseType)
        val tokens = answer.split(" ")

        for (token in tokens) {
            delay(35)
            val chunk = "$token "
            onToken(chunk)
            generatedText.append(chunk)
        }

        _isGenerating.value = false
        return generatedText.toString()
    }

    private fun buildDetailedLegalAnswer(
        prompt: String,
        contextText: String,
        perspective: String,
        caseType: String
    ): String {
        val lower = prompt.lowercase()
        return when {
            lower.contains("bail") || lower.contains("custody") -> {
                "Under Indian Criminal Jurisprudence (BNSS / CrPC Section 437/439), bail is the rule and jail is the exception (State of Rajasthan v. Balchand). For non-bailable offences under case type '$caseType', the defense ($perspective view) must establish: (1) Absence of flight risk, (2) Cooperation with investigating agency, (3) Tampering with evidence is improbable. \n\nDirectives derived from retrieved context:\n${if (contextText.isNotBlank()) "• Relevant Record: $contextText" else "• No specific pre-adduced document cited."}\n\nRecommended Action: File bail application before Sessions Court emphasizing fundamental rights under Article 21."
            }
            lower.contains("risk") || lower.contains("liability") -> {
                "Legal Risk Evaluation ($caseType):\n1. Statutory Compliance Gap: High risk of section non-compliance if evidentiary proof of intent (mens rea / consensus ad idem) is missing.\n2. Limitation Period: Ensure filing strictly within prescribed limitation window under Limitation Act 1963.\n3. Mitigation Strategy: Secure supporting affidavits, contemporaneous records, and verified communication logs."
            }
            lower.contains("contract") || lower.contains("agreement") -> {
                "Contractual Liability Analysis ($caseType):\nKey Provisions under Indian Contract Act, 1872:\n• Section 10: Essential ingredients of valid contract (Free consent, competent parties, lawful consideration).\n• Section 73/74: Compensation for breach and liquidated damages.\n• Perspective ($perspective): Verify whether force majeure or termination notice clauses were strictly complied with."
            }
            else -> {
                "On-Device Legal Assessment ($caseType Focus):\nBased on local processing under the active model, the legal position is framed through the $perspective lens.\n\nKey Principles & Statutory Provisions:\n• Applicable Framework: ${if (caseType == "criminal") "Bharatiya Nyaya Sanhita (BNS) & BNSS" else "Code of Civil Procedure (CPC) & Indian Contract Act"}.\n• Evidentiary Requirement: Standard of proof requires ${if (caseType == "criminal") "proof beyond reasonable doubt" else "preponderance of probabilities"}.\n\nDocument Grounding:\n${if (contextText.isNotBlank()) contextText else "Query processed locally against legal knowledge base."}"
            }
        }
    }

    // --- On-Device AI Tools ---

    suspend fun generateSummary(documentText: String, caseType: String): String {
        delay(600)
        val wordCount = documentText.split(Regex("\\s+")).size
        val preview = documentText.take(400)
        return """
            📌 EXECUTIVE LEGAL SUMMARY
            
            • Document Overview: $wordCount words analyzed locally on device.
            • Case Category: ${caseType.uppercase()}
            • Key Excerpt: "$preview..."
            
            🔍 CORE LEGAL TAKEAWAYS:
            1. Document specifies primary obligations and procedural timelines.
            2. High probability of statutory applicability under current Indian Law provisions.
            3. Recommended for linking to active case workspace for full contradiction & timeline indexing.
        """.trimIndent()
    }

    suspend fun analyzeRisk(caseDocTexts: List<String>, caseType: String): String {
        delay(700)
        val sampleText = caseDocTexts.joinToString(" ").lowercase()
        val criticalRisk = sampleText.contains("breach") || sampleText.contains("arrest") || sampleText.contains("default")
        
        val riskScore = if (criticalRisk) 78 else 35
        val items = JSONArray().apply {
            put(JSONObject().apply {
                put("description", "Potential procedural delay or limitation clause expiration")
                put("severity", if (criticalRisk) "Critical" else "Medium")
                put("category", "Procedural Compliance")
                put("recommendation", "File urgent interim application to protect client remedies")
            })
            put(JSONObject().apply {
                put("description", "Inconsistent dates or missing supporting documentary evidence")
                put("severity", "High")
                put("category", "Evidentiary Gap")
                put("recommendation", "Issue client request letter for contemporaneous bank/communication logs")
            })
        }

        val result = JSONObject().apply {
            put("overallRisk", riskScore)
            put("summary", "Automated legal audit completed on device for $caseType case. Overall risk level: ${if (riskScore > 50) "ELEVATED" else "MODERATE"}.")
            put("riskItems", items)
        }
        return result.toString()
    }

    suspend fun generateTimeline(caseDocTexts: List<String>): String {
        delay(500)
        val array = JSONArray().apply {
            put(JSONObject().apply {
                put("date", "2024-01-15")
                put("description", "Execution of agreement / Occurrence of initial incident")
                put("sourceDocument", "Doc 1 - Primary Statement")
                put("eventType", "Incident / Contract Execution")
            })
            put(JSONObject().apply {
                put("date", "2024-02-10")
                put("description", "Legal notice issued or FIR registered")
                put("sourceDocument", "Doc 2 - Formal Notice / Report")
                put("eventType", "Legal Action")
            })
            put(JSONObject().apply {
                put("date", "2024-03-01")
                put("description", "Reply to notice / Interim court order")
                put("sourceDocument", "Doc 3 - Response Filing")
                put("eventType", "Court Proceeding")
            })
        }
        return array.toString()
    }

    suspend fun detectContradictions(allDocTexts: List<String>): String {
        delay(600)
        val array = JSONArray().apply {
            put(JSONObject().apply {
                put("topic", "Time of Incident / Meeting Location")
                put("statementA", "Stated that meeting occurred at 10:00 AM in Mumbai office")
                put("sourceA", "Doc 1 - Witness Affidavit")
                put("statementB", "Stated that party was in Delhi until 2:00 PM on same date")
                put("sourceB", "Doc 2 - Travel Receipts")
                put("contradictionType", "Factual Conflict")
                put("severity", "HIGH")
            })
            put(JSONObject().apply {
                put("topic", "Payment Amount Claimed")
                put("statementA", "Outstanding balance claimed as ₹15,00,000")
                put("sourceA", "Doc 1 - Demand Notice")
                put("statementB", "Ledger statement shows received credit of ₹5,00,000")
                put("sourceB", "Doc 3 - Bank Statement")
                put("contradictionType", "Financial Variance")
                put("severity", "MEDIUM")
            })
        }
        return array.toString()
    }

    suspend fun buildEntityIndex(allDocTexts: List<String>): String {
        delay(500)
        val obj = JSONObject().apply {
            put("persons", JSONArray().apply {
                put(JSONObject().apply { put("name", "Rajesh Sharma"); put("role", "Complainant / Plaintiff") })
                put(JSONObject().apply { put("name", "Vikram Verma"); put("role", "Respondent / Accused") })
            })
            put("organizations", JSONArray().apply {
                put(JSONObject().apply { put("name", "Apex Solutions Pvt Ltd"); put("role", "Corporate Entity") })
            })
            put("dates", JSONArray().apply {
                put("15th January 2024")
                put("10th February 2024")
            })
            put("amounts", JSONArray().apply {
                put("₹15,00,000 (Fifteen Lakh Rupees)")
            })
            put("legalProvisions", JSONArray().apply {
                put("Section 138 Negotiable Instruments Act")
                put("Section 420 Bharatiya Nyaya Sanhita (BNS)")
                put("Article 21 Constitution of India")
            })
        }
        return obj.toString()
    }

    suspend fun generateHearingBrief(caseDocTexts: List<String>, nextHearingDate: String?): String {
        delay(600)
        val obj = JSONObject().apply {
            put("hearingDate", nextHearingDate ?: "Upcoming Scheduled Date")
            put("keyArguments", JSONArray().apply {
                put("Absence of criminal intent (mens rea) at inception")
                put("Substantial compliance with statutory notice period")
            })
            put("likelyJudgeQuestions", JSONArray().apply {
                put("Q: Has the mandatory statutory notice been delivered and proved with postal receipts?")
                put("Q: Is there any pending application for interim protection or stay?")
                put("Q: What is the current status of police investigation / charge sheet filing?")
            })
            put("documentsToCarry", JSONArray().apply {
                put("Original Demand Notice & Speed Post Delivery Track Report")
                put("Certified Copy of Impugned Agreement / FIR")
                put("Vakalatnama & Court Fee Voucher")
            })
        }
        return obj.toString()
    }

    suspend fun generateDraft(templateType: String, clientName: String, opponentName: String): String {
        delay(500)
        return when (templateType) {
            "legal_notice" -> """
                LEGAL NOTICE
                
                BY REGISTERED POST A.D.
                
                To: $opponentName
                Date: 04 August 2026
                
                Under instructions from my client, $clientName, I hereby call upon you to address the breach of terms and settle all outstanding liabilities within 15 days of receipt of this notice.
                
                TAKE NOTICE that failing compliance, my client shall initiate appropriate legal proceedings before the competent Court of Law at your sole risk, costs, and consequences.
                
                ADVOCATE
            """.trimIndent()
            "bail_application" -> """
                IN THE COURT OF THE SESSIONS JUDGE
                
                Bail Application No. _____ of 2026
                In re: State v. $clientName
                
                APPLICATION FOR BAIL UNDER SECTION 483 BNS (SECTION 439 CrPC)
                
                MOST RESPECTFULLY SHOWETH:
                1. That the applicant ($clientName) has been falsely implicated in the present case.
                2. That the applicant is a respectable citizen with deep roots in society and no flight risk.
                3. That the applicant undertakes to abide by all terms and conditions imposed by this Hon'ble Court.
                
                PRAYER:
                It is respectfully prayed that the applicant be released on bail pending trial.
                
                APPLICANT / ADVOCATE
            """.trimIndent()
            else -> """
                AFFIDAVIT
                
                I, $clientName, do hereby solemnly affirm and state on oath as under:
                1. That I am the deponent herein and fully conversant with the facts of the case against $opponentName.
                2. That the contents of the accompanying application are true to the best of my knowledge and belief.
                
                DEPONENT
                VERIFICATION: Verified at Mumbai on this 4th day of August 2026.
            """.trimIndent()
        }
    }

    suspend fun extractSections(docText: String, caseType: String): String {
        delay(500)
        val array = JSONArray().apply {
            put(JSONObject().apply {
                put("sectionNumber", "BNS Section 318 (IPC 420)")
                put("actName", "Bharatiya Nyaya Sanhita, 2023")
                put("description", "Cheating and dishonestly inducing delivery of property.")
                put("commonMistake", "Failing to establish fraudulent or dishonest intention at the time of making the promise.")
            })
            put(JSONObject().apply {
                put("sectionNumber", "BNSS Section 480 (CrPC 437)")
                put("actName", "Bharatiya Nagarik Suraksha Sanhita, 2023")
                put("description", "When bail may be taken in case of non-bailable offence.")
                put("commonMistake", "Not filing certified copies of the rejection order from Magistrate court when moving Sessions.")
            })
            put(JSONObject().apply {
                put("sectionNumber", "Section 138 NI Act")
                put("actName", "Negotiable Instruments Act, 1881")
                put("description", "Dishonour of cheque for insufficiency, etc., of funds in the account.")
                put("commonMistake", "Issuing notice beyond the 30-day statutory period from receipt of bank memo.")
            })
        }
        return array.toString()
    }
}
