package com.legalai.data.model

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(
    tableName = "documents",
    foreignKeys = [
        ForeignKey(
            entity = Case::class,
            parentColumns = ["id"],
            childColumns = ["caseId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["caseId"])]
)
data class Document(
    @PrimaryKey val id: String,
    val caseId: String,
    val name: String,
    val size: Long,
    val uploadedAt: String,
    val summary: String,
    val contentText: String
)
