package com.legalai.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.legalai.data.model.Case
import com.legalai.data.model.Document
import com.legalai.data.repository.CaseRepository
import com.legalai.data.repository.DocumentRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.util.UUID
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalCoroutinesApi::class)
class CaseViewModel(
    private val caseRepository: CaseRepository,
    private val documentRepository: DocumentRepository
) : ViewModel() {

    val allCases: StateFlow<List<Case>> = caseRepository.allCases
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    private val _selectedCaseId = MutableStateFlow<String?>(null)
    val selectedCaseId: StateFlow<String?> = _selectedCaseId

    val selectedCaseDocuments: StateFlow<List<Document>> = _selectedCaseId
        .flatMapLatest { id ->
            if (id != null) {
                documentRepository.getDocumentsForCase(id)
            } else {
                flowOf(emptyList())
            }
        }
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    fun selectCase(caseId: String?) {
        _selectedCaseId.value = caseId
    }

    fun addCase(
        title: String,
        clientName: String,
        court: String,
        caseType: String,
        status: String,
        nextHearingDate: String,
        notes: String,
        tags: String
    ) {
        viewModelScope.launch {
            val newCase = Case(
                id = UUID.randomUUID().toString(),
                title = title,
                clientName = clientName,
                court = court,
                caseType = caseType,
                status = status,
                nextHearingDate = nextHearingDate,
                notes = notes,
                tags = tags
            )
            caseRepository.insertCase(newCase)
        }
    }

    fun deleteCase(case: Case) {
        viewModelScope.launch {
            caseRepository.deleteCase(case)
        }
    }

    fun addDocumentToCase(caseId: String, name: String, textContent: String) {
        viewModelScope.launch {
            val newDoc = Document(
                id = UUID.randomUUID().toString(),
                caseId = caseId,
                name = name,
                size = textContent.length.toLong(),
                uploadedAt = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(Date()),
                summary = if (textContent.length > 100) textContent.substring(0, 100) + "..." else textContent,
                contentText = textContent
            )
            documentRepository.insertDocument(newDoc)
        }
    }

    fun deleteDocument(document: Document) {
        viewModelScope.launch {
            documentRepository.deleteDocument(document)
        }
    }

    fun clearAllData() {
        viewModelScope.launch {
            caseRepository.deleteAllCases()
            documentRepository.deleteAllDocuments()
        }
    }
}

class CaseViewModelFactory(
    private val caseRepository: CaseRepository,
    private val documentRepository: DocumentRepository
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(CaseViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return CaseViewModel(caseRepository, documentRepository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
