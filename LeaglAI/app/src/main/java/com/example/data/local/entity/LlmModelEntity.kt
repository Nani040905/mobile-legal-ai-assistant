package com.example.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "llm_models")
data class LlmModelEntity(
    @PrimaryKey val id: String,
    val name: String,
    val parameterSize: String, // e.g. "3B Params", "1.5B Params", "1B Params"
    val sizeLabel: String, // e.g. "1.96 GB", "1.13 GB", "0.81 GB"
    val totalBytes: Long,
    val downloadedBytes: Long = 0,
    val isDownloaded: Boolean = false,
    val isSelected: Boolean = false,
    val description: String,
    val bestFor: String,
    val downloadUrl: String,
    val localFilePath: String = ""
)
