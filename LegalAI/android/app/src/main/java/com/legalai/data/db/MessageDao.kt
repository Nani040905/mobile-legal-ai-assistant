package com.legalai.data.db

import androidx.room.*
import com.legalai.data.model.Message
import kotlinx.coroutines.flow.Flow

@Dao
interface MessageDao {
    @Query("SELECT * FROM messages WHERE caseId = :caseId ORDER BY timestamp ASC")
    fun getMessagesForCaseFlow(caseId: String): Flow<List<Message>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: Message)

    @Query("DELETE FROM messages WHERE caseId = :caseId")
    suspend fun deleteMessagesForCase(caseId: String)

    @Query("DELETE FROM messages")
    suspend fun deleteAllMessages()
}
