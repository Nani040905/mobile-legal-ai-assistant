package com.example.data.local.dao

import androidx.room.*
import com.example.data.local.entity.DocumentEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DocumentDao {
    @Query("SELECT * FROM documents ORDER BY importedAt DESC")
    fun getAllDocuments(): Flow<List<DocumentEntity>>

    @Query("SELECT * FROM documents WHERE caseId = :caseId ORDER BY importedAt DESC")
    fun getDocumentsByCaseId(caseId: String): Flow<List<DocumentEntity>>

    @Query("SELECT * FROM documents WHERE caseId = :caseId ORDER BY importedAt DESC")
    suspend fun getDocumentsByCaseIdOnce(caseId: String): List<DocumentEntity>

    @Query("SELECT * FROM documents WHERE id = :id")
    fun getDocumentById(id: String): Flow<DocumentEntity?>

    @Query("SELECT * FROM documents WHERE id = :id")
    suspend fun getDocumentByIdOnce(id: String): DocumentEntity?

    @Query("SELECT * FROM documents WHERE isSynced = 0")
    suspend fun getUnsyncedDocuments(): List<DocumentEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDocument(document: DocumentEntity)

    @Query("DELETE FROM documents WHERE id = :id")
    suspend fun deleteDocumentById(id: String)

    @Query("DELETE FROM documents")
    suspend fun deleteAllDocuments()
}
