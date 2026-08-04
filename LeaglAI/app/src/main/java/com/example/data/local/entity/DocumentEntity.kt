package com.example.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "documents")
data class DocumentEntity(
    @PrimaryKey val id: String,
    val caseId: String? = null,
    val name: String,
    val fileUri: String,
    val fileSize: Long,
    val wordCount: Int,
    val fullText: String,
    val chunksJson: String, // JSON array of chunk strings
    val importedAt: Long = System.currentTimeMillis(),
    val isSynced: Boolean = false
)
