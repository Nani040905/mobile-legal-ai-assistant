package com.legalai.data.repository

import com.legalai.data.db.CaseDao
import com.legalai.data.model.Case
import kotlinx.coroutines.flow.Flow

class CaseRepository(private val caseDao: CaseDao) {
    val allCases: Flow<List<Case>> = caseDao.getAllCasesFlow()

    suspend fun getCaseById(id: String): Case? {
        return caseDao.getCaseById(id)
    }

    suspend fun insertCase(case: Case) {
        caseDao.insertCase(case)
    }

    suspend fun updateCase(case: Case) {
        caseDao.updateCase(case)
    }

    suspend fun deleteCase(case: Case) {
        caseDao.deleteCase(case)
    }

    suspend fun deleteAllCases() {
        caseDao.deleteAllCases()
    }
}
