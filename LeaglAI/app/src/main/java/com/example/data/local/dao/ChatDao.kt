package com.example.data.local.dao

import androidx.room.*
import com.example.data.local.entity.ChatMessageEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ChatDao {
    @Query("SELECT * FROM chat_messages WHERE caseId = :caseId ORDER BY timestamp ASC")
    fun getMessagesForCase(caseId: String): Flow<List<ChatMessageEntity>>

    @Query("SELECT * FROM chat_messages WHERE caseId = :caseId ORDER BY timestamp ASC")
    suspend fun getMessagesForCaseOnce(caseId: String): List<ChatMessageEntity>

    @Query("SELECT * FROM chat_messages WHERE isSynced = 0")
    suspend fun getUnsyncedMessages(): List<ChatMessageEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: ChatMessageEntity)

    @Query("DELETE FROM chat_messages WHERE caseId = :caseId")
    suspend fun deleteMessagesForCase(caseId: String)

    @Query("DELETE FROM chat_messages")
    suspend fun deleteAllMessages()
}
