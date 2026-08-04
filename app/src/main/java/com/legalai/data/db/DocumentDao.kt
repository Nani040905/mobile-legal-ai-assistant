package com.legalai.data.db

import androidx.room.*
import com.legalai.data.model.Document
import kotlinx.coroutines.flow.Flow

@Dao
interface DocumentDao {
    @Query("SELECT * FROM documents WHERE caseId = :caseId")
    fun getDocumentsForCaseFlow(caseId: String): Flow<List<Document>>

    @Query("SELECT * FROM documents WHERE id = :id")
    suspend fun getDocumentById(id: String): Document?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDocument(document: Document)

    @Delete
    suspend fun deleteDocument(document: Document)

    @Query("DELETE FROM documents WHERE caseId = :caseId")
    suspend fun deleteDocumentsForCase(caseId: String)

    @Query("DELETE FROM documents")
    suspend fun deleteAllDocuments()
}
