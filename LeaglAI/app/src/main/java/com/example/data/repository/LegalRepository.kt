package com.example.data.repository

import android.content.Context
import com.example.data.biometric.BiometricAuthManager
import com.example.data.llm.LocalLlmEngine
import com.example.data.local.AppDatabase
import com.example.data.local.entity.*
import com.example.data.sync.NetworkMonitor
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.util.UUID

class LegalRepository(
    private val context: Context,
    private val repositoryScope: CoroutineScope
) {
    private val db = AppDatabase.getDatabase(context)
    private val caseDao = db.caseDao()
    private val documentDao = db.documentDao()
    private val chatDao = db.chatDao()
    private val syncDao = db.syncDao()
    private val llmModelDao = db.llmModelDao()

    val networkMonitor = NetworkMonitor(context)
    val biometricAuthManager = BiometricAuthManager(context)
    val localLlmEngine = LocalLlmEngine(context, llmModelDao)

    val isOnline: StateFlow<Boolean> = networkMonitor.isOnline
    val pendingSyncCount: Flow<Int> = syncDao.getPendingSyncCount()

    init {
        repositoryScope.launch(Dispatchers.IO) {
            localLlmEngine.initializeDefaultModels()
            // Auto sync when online network available
            isOnline.collect { online ->
                if (online) {
                    syncPendingQueue()
                }
            }
        }
    }

    // --- Cases ---
    val allCases: Flow<List<CaseFolderEntity>> = caseDao.getAllCases()

    fun getCaseById(id: String): Flow<CaseFolderEntity?> = caseDao.getCaseById(id)

    suspend fun createCase(
        title: String,
        clientName: String,
        caseType: String,
        description: String,
        tags: List<String> = emptyList()
    ): String {
        val id = "case_${UUID.randomUUID().toString().take(8)}"
        val entity = CaseFolderEntity(
            id = id,
            title = title,
            clientName = clientName,
            caseType = caseType,
            description = description,
            status = "Active",
            tagsCsv = tags.joinToString(",")
        )
        caseDao.insertCase(entity)
        enqueueSync("CASE", id, "CREATE", "Created case '$title'")
        return id
    }

    suspend fun updateCase(caseFolder: CaseFolderEntity) {
        caseDao.updateCase(caseFolder)
        enqueueSync("CASE", caseFolder.id, "UPDATE", "Updated case '${caseFolder.title}'")
    }

    suspend fun deleteCase(id: String) {
        caseDao.deleteCaseById(id)
        enqueueSync("CASE", id, "DELETE", "Deleted case")
    }

    // --- Documents ---
    val allDocuments: Flow<List<DocumentEntity>> = documentDao.getAllDocuments()

    fun getDocumentsByCase(caseId: String): Flow<List<DocumentEntity>> = documentDao.getDocumentsByCaseId(caseId)

    fun getDocumentById(id: String): Flow<DocumentEntity?> = documentDao.getDocumentById(id)

    suspend fun addDocument(
        caseId: String?,
        name: String,
        fileUri: String,
        fullText: String
    ): String {
        val docId = "doc_${UUID.randomUUID().toString().take(8)}"
        val words = fullText.split(Regex("\\s+")).filter { it.isNotBlank() }
        
        // Chunk splitting (1000 char windows)
        val chunks = mutableListOf<String>()
        var start = 0
        while (start < fullText.length) {
            val end = (start + 1000).coerceAtMost(fullText.length)
            chunks.add(fullText.substring(start, end))
            start = end
        }

        val chunksJson = "[${chunks.joinToString(",") { "\"${it.replace("\"", "\\\"").replace("\n", " ")}\"" }}]"

        val entity = DocumentEntity(
            id = docId,
            caseId = caseId,
            name = name,
            fileUri = fileUri,
            fileSize = fullText.length.toLong(),
            wordCount = words.size,
            fullText = fullText,
            chunksJson = chunksJson
        )
        documentDao.insertDocument(entity)
        enqueueSync("DOCUMENT", docId, "CREATE", "Added document '$name'")
        return docId
    }

    suspend fun deleteDocument(id: String) {
        documentDao.deleteDocumentById(id)
        enqueueSync("DOCUMENT", id, "DELETE", "Deleted document")
    }

    // --- Chat Messages ---
    fun getChatMessages(caseId: String): Flow<List<ChatMessageEntity>> = chatDao.getMessagesForCase(caseId)

    suspend fun sendChatMessage(
        caseId: String,
        userQuery: String,
        perspective: String = "neutral",
        caseType: String = "criminal"
    ): String {
        val userMsgId = "msg_${UUID.randomUUID().toString().take(8)}"
        val userMsg = ChatMessageEntity(
            id = userMsgId,
            caseId = caseId,
            role = "user",
            content = userQuery,
            perspective = perspective,
            caseType = caseType
        )
        chatDao.insertMessage(userMsg)
        enqueueSync("CHAT", userMsgId, "CREATE", "User query sent")

        // Retrieve relevant document chunks for case
        val caseDocs = documentDao.getDocumentsByCaseIdOnce(caseId)
        val allChunks = caseDocs.flatMap { doc ->
            doc.chunksJson.removeSurrounding("[", "]")
                .split("\",\"")
                .map { it.replace("\"", "") }
        }

        val ranked = localLlmEngine.rankChunksBM25(userQuery, allChunks)
        val contextText = ranked.joinToString("\n---\n") { it.chunk }

        val botResponse = localLlmEngine.streamResponse(
            prompt = userQuery,
            contextText = contextText,
            perspective = perspective,
            caseType = caseType,
            onToken = {}
        )

        val botMsgId = "msg_${UUID.randomUUID().toString().take(8)}"
        val botMsg = ChatMessageEntity(
            id = botMsgId,
            caseId = caseId,
            role = "assistant",
            content = botResponse,
            perspective = perspective,
            caseType = caseType
        )
        chatDao.insertMessage(botMsg)
        enqueueSync("CHAT", botMsgId, "CREATE", "AI assistant response")

        return botResponse
    }

    suspend fun clearChatHistory(caseId: String) {
        chatDao.deleteMessagesForCase(caseId)
    }

    // --- AI Analysis Triggers ---

    suspend fun runRiskAnalysis(caseId: String) {
        val caseFolder = caseDao.getCaseByIdOnce(caseId) ?: return
        val docs = documentDao.getDocumentsByCaseIdOnce(caseId)
        val docTexts = docs.map { it.fullText }
        val report = localLlmEngine.analyzeRisk(docTexts, caseFolder.caseType)
        caseDao.updateCase(caseFolder.copy(riskReportJson = report, updatedAt = System.currentTimeMillis()))
        enqueueSync("CASE", caseId, "UPDATE", "Ran Risk Analysis")
    }

    suspend fun runTimelineAnalysis(caseId: String) {
        val caseFolder = caseDao.getCaseByIdOnce(caseId) ?: return
        val docs = documentDao.getDocumentsByCaseIdOnce(caseId)
        val docTexts = docs.map { it.fullText }
        val timeline = localLlmEngine.generateTimeline(docTexts)
        caseDao.updateCase(caseFolder.copy(timelineJson = timeline, updatedAt = System.currentTimeMillis()))
        enqueueSync("CASE", caseId, "UPDATE", "Ran Timeline Analysis")
    }

    suspend fun runContradictionScan(caseId: String) {
        val caseFolder = caseDao.getCaseByIdOnce(caseId) ?: return
        val docs = documentDao.getDocumentsByCaseIdOnce(caseId)
        val docTexts = docs.map { it.fullText }
        val report = localLlmEngine.detectContradictions(docTexts)
        caseDao.updateCase(caseFolder.copy(contradictionReportJson = report, updatedAt = System.currentTimeMillis()))
        enqueueSync("CASE", caseId, "UPDATE", "Ran Contradiction Scan")
    }

    suspend fun runEntityIndexing(caseId: String) {
        val caseFolder = caseDao.getCaseByIdOnce(caseId) ?: return
        val docs = documentDao.getDocumentsByCaseIdOnce(caseId)
        val docTexts = docs.map { it.fullText }
        val index = localLlmEngine.buildEntityIndex(docTexts)
        caseDao.updateCase(caseFolder.copy(entityIndexJson = index, updatedAt = System.currentTimeMillis()))
        enqueueSync("CASE", caseId, "UPDATE", "Ran Entity Indexing")
    }

    suspend fun runHearingPrep(caseId: String) {
        val caseFolder = caseDao.getCaseByIdOnce(caseId) ?: return
        val docs = documentDao.getDocumentsByCaseIdOnce(caseId)
        val docTexts = docs.map { it.fullText }
        val brief = localLlmEngine.generateHearingBrief(docTexts, caseFolder.nextHearingDate)
        caseDao.updateCase(caseFolder.copy(hearingBriefJson = brief, updatedAt = System.currentTimeMillis()))
        enqueueSync("CASE", caseId, "UPDATE", "Ran Hearing Prep")
    }

    // --- Sync Queue & Cloud Sync ---

    private suspend fun enqueueSync(entityType: String, entityId: String, action: String, details: String) {
        syncDao.insertSyncTask(
            SyncQueueEntity(
                entityType = entityType,
                entityId = entityId,
                action = action,
                details = details
            )
        )
        if (isOnline.value) {
            syncPendingQueue()
        }
    }

    suspend fun syncPendingQueue() {
        val pending = syncDao.getPendingSyncQueueOnce()
        if (pending.isEmpty()) return

        for (task in pending) {
            syncDao.updateSyncTask(task.copy(status = "SYNCING"))
            // Simulate cloud server synchronization
            kotlinx.coroutines.delay(100)
            syncDao.updateSyncTask(task.copy(status = "SYNCED"))

            // Mark local entity as synced
            when (task.entityType) {
                "CASE" -> {
                    caseDao.getCaseByIdOnce(task.entityId)?.let {
                        caseDao.updateCase(it.copy(isSynced = true))
                    }
                }
                "DOCUMENT" -> {
                    documentDao.getDocumentByIdOnce(task.entityId)?.let {
                        documentDao.insertDocument(it.copy(isSynced = true))
                    }
                }
            }
        }
        syncDao.clearSyncedTasks()
    }

    suspend fun wipeAllLocalData() {
        caseDao.deleteAllCases()
        documentDao.deleteAllDocuments()
        chatDao.deleteAllMessages()
        syncDao.clearAllTasks()
    }
}
