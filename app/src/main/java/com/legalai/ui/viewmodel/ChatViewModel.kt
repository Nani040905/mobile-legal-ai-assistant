package com.legalai.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.legalai.data.model.Message
import com.legalai.data.repository.MessageRepository
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.util.UUID

@OptIn(ExperimentalCoroutinesApi::class)
class ChatViewModel(private val messageRepository: MessageRepository) : ViewModel() {

    private val _currentCaseId = MutableStateFlow<String?>(null)
    val currentCaseId: StateFlow<String?> = _currentCaseId

    val caseMessages: StateFlow<List<Message>> = _currentCaseId
        .flatMapLatest { id ->
            if (id != null) {
                messageRepository.getMessagesForCase(id)
            } else {
                flowOf(emptyList())
            }
        }
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    fun setCase(caseId: String?) {
        _currentCaseId.value = caseId
    }

    fun sendMessage(caseId: String, text: String) {
        viewModelScope.launch {
            // 1. Insert user message
            val userMsg = Message(
                id = UUID.randomUUID().toString(),
                caseId = caseId,
                role = "user",
                content = text,
                timestamp = System.currentTimeMillis()
            )
            messageRepository.insertMessage(userMsg)

            // Simulate minor thinking latency
            delay(500)

            // 2. Setup AI message streaming
            val aiMsgId = UUID.randomUUID().toString()
            val fullResponse = "Based on the precedents in your case folder and relevant rules of Indian Civil Law, the arguments look stable. Telemetry: Latency 142ms, RAM overhead minimal. Scanning finished."
            val words = fullResponse.split(" ")
            
            var currentContent = ""
            for (word in words) {
                currentContent += if (currentContent.isEmpty()) word else " $word"
                val aiMsg = Message(
                    id = aiMsgId,
                    caseId = caseId,
                    role = "assistant", // Use 'assistant' matching React Native role, or 'model'
                    content = currentContent,
                    timestamp = System.currentTimeMillis()
                )
                messageRepository.insertMessage(aiMsg)
                delay(80) // simulates live streaming typing effect
            }
        }
    }

    fun clearMessages(caseId: String) {
        viewModelScope.launch {
            messageRepository.deleteMessagesForCase(caseId)
        }
    }
}

class ChatViewModelFactory(
    private val messageRepository: MessageRepository
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(ChatViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return ChatViewModel(messageRepository) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}
