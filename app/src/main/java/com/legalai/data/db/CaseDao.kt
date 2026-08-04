package com.legalai.data.db

import androidx.room.*
import com.legalai.data.model.Case
import kotlinx.coroutines.flow.Flow

@Dao
interface CaseDao {
    @Query("SELECT * FROM cases")
    fun getAllCasesFlow(): Flow<List<Case>>

    @Query("SELECT * FROM cases WHERE id = :id")
    suspend fun getCaseById(id: String): Case?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCase(caseData: Case)

    @Update
    suspend fun updateCase(caseData: Case)

    @Delete
    suspend fun deleteCase(caseData: Case)

    @Query("DELETE FROM cases")
    suspend fun deleteAllCases()
}
