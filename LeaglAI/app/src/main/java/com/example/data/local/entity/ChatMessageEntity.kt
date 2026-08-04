package com.example.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "chat_messages")
data class ChatMessageEntity(
    @PrimaryKey val id: String,
    val caseId: String,
    val role: String, // "user" or "assistant"
    val content: String,
    val timestamp: Long = System.currentTimeMillis(),
    val perspective: String = "neutral", // "neutral", "prosecution", "defense", "plaintiff", "defendant", "mediator"
    val caseType: String = "criminal",
    val modelUsed: String = "Qwen 2.5 3B",
    val isSynced: Boolean = false
)
