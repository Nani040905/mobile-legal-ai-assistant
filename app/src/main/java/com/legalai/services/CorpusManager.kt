package com.legalai.services

object CorpusManager {
    data class Act(
        val id: String,
        val name: String,
        val abbreviation: String,
        val year: Int,
        val totalSections: Int
    )

    val acts = listOf(
        Act("ipc_1860", "Indian Penal Code", "IPC", 1860, 511),
        Act("bns_2023", "Bharatiya Nyaya Sanhita", "BNS", 2023, 358),
        Act("crpc_1973", "Code of Criminal Procedure", "CrPC", 1973, 484),
        Act("bnss_2023", "Bharatiya Nagarik Suraksha Sanhita", "BNSS", 2023, 531),
        Act("iea_1872", "Indian Evidence Act", "IEA", 1872, 167),
        Act("bsa_2023", "Bharatiya Sakshya Adhiniyam", "BSA", 2023, 170)
    )

    fun searchCorpusMetadata(query: String): List<Act> {
        if (query.isBlank()) return emptyList()
        val lowerQuery = query.lowercase()
        return acts.filter { act ->
            act.name.lowercase().contains(lowerQuery) ||
            act.abbreviation.lowercase().contains(lowerQuery)
        }
    }

    fun getActMetadata(actId: String): Act? {
        return acts.find { act -> act.id == actId }
    }

    val RETRIEVAL_GUIDELINES = MapRetrievalGuidelines(
        defaultTopK = 3,
        maxContextBudgetCharacters = 3000,
        similarityThreshold = 0.65,
        useStemming = true
    )
}

data class MapRetrievalGuidelines(
    val defaultTopK: Int,
    val maxContextBudgetCharacters: Int,
    val similarityThreshold: Double,
    val useStemming: Boolean
)
