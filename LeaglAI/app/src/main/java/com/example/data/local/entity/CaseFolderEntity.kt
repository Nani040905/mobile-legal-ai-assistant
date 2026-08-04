package com.example.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cases")
data class CaseFolderEntity(
    @PrimaryKey val id: String,
    val title: String,
    val clientName: String,
    val caseType: String, // "criminal", "civil", "contract", "corporate", "family", "property", "tax"
    val description: String,
    val status: String, // "Active", "Closed", "On Hold"
    val nextHearingDate: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isSynced: Boolean = false,
    val tagsCsv: String = "", // Comma-separated tags, e.g., "Urgent,Evidence Pending"
    val notesJson: String = "[]", // JSON array of notes
    val timelineJson: String? = null,
    val contradictionReportJson: String? = null,
    val entityIndexJson: String? = null,
    val evidenceChainReportJson: String? = null,
    val missingDocsReportJson: String? = null,
    val hearingBriefJson: String? = null,
    val opponentPredictionJson: String? = null,
    val clientQuestionsJson: String? = null,
    val riskReportJson: String? = null,
    val strategyReportJson: String? = null
)
