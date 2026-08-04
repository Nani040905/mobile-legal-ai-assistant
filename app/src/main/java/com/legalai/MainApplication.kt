package com.legalai

import android.app.Application
import com.legalai.data.db.AppDatabase
import com.legalai.data.repository.CaseRepository
import com.legalai.data.repository.DocumentRepository
import com.legalai.data.repository.MessageRepository

class MainApplication : Application() {
    val database by lazy { AppDatabase.getDatabase(this) }
    val caseRepository by lazy { CaseRepository(database.caseDao()) }
    val documentRepository by lazy { DocumentRepository(database.documentDao()) }
    val messageRepository by lazy { MessageRepository(database.messageDao()) }

    override fun onCreate() {
        super.onCreate()
    }
}
