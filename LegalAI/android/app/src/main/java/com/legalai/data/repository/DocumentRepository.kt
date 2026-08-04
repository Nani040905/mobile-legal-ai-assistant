package com.legalai.data.repository

import com.legalai.data.db.DocumentDao
import com.legalai.data.model.Document
import kotlinx.coroutines.flow.Flow

class DocumentRepository(private val documentDao: DocumentDao) {
    fun getDocumentsForCase(caseId: String): Flow<List<Document>> {
        return documentDao.getDocumentsForCaseFlow(caseId)
    }

    suspend fun getDocumentById(id: String): Document? {
        return documentDao.getDocumentById(id)
    }

    suspend fun insertDocument(document: Document) {
        documentDao.insertDocument(document)
    }

    suspend fun deleteDocument(document: Document) {
        documentDao.deleteDocument(document)
    }

    suspend fun deleteDocumentsForCase(caseId: String) {
        documentDao.deleteDocumentsForCase(caseId)
    }

    suspend fun deleteAllDocuments() {
        documentDao.deleteAllDocuments()
    }
}
