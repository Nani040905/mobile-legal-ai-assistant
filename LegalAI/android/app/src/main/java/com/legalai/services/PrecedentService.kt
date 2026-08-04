package com.legalai.services

object PrecedentService {
    data class Precedent(
        val id: String,
        val citation: String,
        val title: String,
        val court: String,
        val year: Int,
        val bench: String,
        val relevanceScore: Double,
        val summary: String,
        val keyRatio: String = ""
    )

    data class PrecedentFilter(
        val court: String? = null,
        val startYear: Int? = null,
        val endYear: Int? = null,
        val benchSize: String? = null
    )

    suspend fun searchPrecedents(query: String, filters: PrecedentFilter = PrecedentFilter()): List<Precedent> {
        println("[PrecedentService] Staging search query \"$query\" with filters: $filters")
        if (query.isBlank()) return emptyList()
        return listOf(
            Precedent(
                id = "prec_01",
                citation = "2017 (10) SCC 1",
                title = "K.S. Puttaswamy v. Union of India",
                court = "Supreme Court of India",
                year = 2017,
                bench = "9 Judges",
                relevanceScore = 0.98,
                summary = "Right to Privacy is protected as an intrinsic part of the right to life and personal liberty under Article 21."
            ),
            Precedent(
                id = "prec_02",
                citation = "1973 (4) SCC 225",
                title = "Kesavananda Bharati v. State of Kerala",
                court = "Supreme Court of India",
                year = 1973,
                bench = "13 Judges",
                relevanceScore = 0.91,
                summary = "Defined the Basic Structure Doctrine, limiting the amending power of the Parliament."
            )
        )
    }

    suspend fun getPrecedentDetails(precedentId: String): Precedent? {
        println("[PrecedentService] Fetching precedent details for: $precedentId")
        return if (precedentId == "prec_01") {
            Precedent(
                id = "prec_01",
                citation = "2017 (10) SCC 1",
                title = "K.S. Puttaswamy v. Union of India",
                court = "Supreme Court of India",
                year = 2017,
                bench = "9 Judges",
                relevanceScore = 0.98,
                summary = "Right to Privacy is protected as an intrinsic part of the right to life and personal liberty under Article 21.",
                keyRatio = "Privacy is a constitutionally protected right in India, emerging primarily from Article 21 of the Constitution."
            )
        } else null
    }

    suspend fun citePrecedentInBrief(precedentId: String, briefId: String): Boolean {
        println("[PrecedentService] Citing precedent $precedentId inside brief $briefId")
        return true
    }
}
