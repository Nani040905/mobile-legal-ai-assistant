package com.example.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sync_queue")
data class SyncQueueEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val entityType: String, // "CASE", "DOCUMENT", "CHAT"
    val entityId: String,
    val action: String, // "CREATE", "UPDATE", "DELETE"
    val timestamp: Long = System.currentTimeMillis(),
    val status: String = "PENDING", // "PENDING", "SYNCING", "SYNCED", "FAILED"
    val retryCount: Int = 0,
    val details: String = ""
)
