package com.legalai.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cases")
data class Case(
    @PrimaryKey val id: String,
    val title: String,
    val clientName: String,
    val court: String,
    val caseType: String,
    val status: String,
    val nextHearingDate: String,
    val notes: String,
    val tags: String // Comma-separated tags or JSON
)
