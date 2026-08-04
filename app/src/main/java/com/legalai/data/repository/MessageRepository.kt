package com.legalai.data.repository

import com.legalai.data.db.MessageDao
import com.legalai.data.model.Message
import kotlinx.coroutines.flow.Flow

class MessageRepository(private val messageDao: MessageDao) {
    fun getMessagesForCase(caseId: String): Flow<List<Message>> {
        return messageDao.getMessagesForCaseFlow(caseId)
    }

    suspend fun insertMessage(message: Message) {
        messageDao.insertMessage(message)
    }

    suspend fun deleteMessagesForCase(caseId: String) {
        messageDao.deleteMessagesForCase(caseId)
    }

    suspend fun deleteAllMessages() {
        messageDao.deleteAllMessages()
    }
}
