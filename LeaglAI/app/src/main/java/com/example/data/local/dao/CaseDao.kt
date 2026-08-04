package com.example.data.local.dao

import androidx.room.*
import com.example.data.local.entity.CaseFolderEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CaseDao {
    @Query("SELECT * FROM cases ORDER BY updatedAt DESC")
    fun getAllCases(): Flow<List<CaseFolderEntity>>

    @Query("SELECT * FROM cases WHERE id = :id")
    fun getCaseById(id: String): Flow<CaseFolderEntity?>

    @Query("SELECT * FROM cases WHERE id = :id")
    suspend fun getCaseByIdOnce(id: String): CaseFolderEntity?

    @Query("SELECT * FROM cases WHERE isSynced = 0")
    suspend fun getUnsyncedCases(): List<CaseFolderEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCase(caseFolder: CaseFolderEntity)

    @Update
    suspend fun updateCase(caseFolder: CaseFolderEntity)

    @Query("DELETE FROM cases WHERE id = :id")
    suspend fun deleteCaseById(id: String)

    @Query("DELETE FROM cases")
    suspend fun deleteAllCases()
}
