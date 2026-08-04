package com.example

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import androidx.navigation.NavType
import androidx.navigation.compose.*
import androidx.navigation.navArgument
import com.example.data.repository.LegalRepository
import com.example.ui.screens.*
import com.example.ui.theme.GoldPrimary
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.theme.NavyBackground
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MainActivity : FragmentActivity() {

    private lateinit var repository: LegalRepository

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        repository = LegalRepository(this, lifecycleScope)

        // Seed initial sample case if database is fresh
        lifecycleScope.launch(Dispatchers.IO) {
            val cases = repository.allCases
            // Ensure repository initializes properly
        }

        setContent {
            MyApplicationTheme {
                val navController = rememberNavController()

                // State Flow Collectors
                val isOnline by repository.isOnline.collectAsState()
                val pendingSyncCount by repository.pendingSyncCount.collectAsState(initial = 0)
                val isUnlocked by repository.biometricAuthManager.isUnlocked.collectAsState()
                val biometricEnabled by repository.biometricAuthManager.biometricEnabled.collectAsState()
                val cases by repository.allCases.collectAsState(initial = emptyList())
                val documents by repository.allDocuments.collectAsState(initial = emptyList())
                val models by repository.localLlmEngine.allModels.collectAsState(initial = emptyList())
                val selectedModel by repository.localLlmEngine.selectedModel.collectAsState(initial = null)
                val downloadProgressMap by repository.localLlmEngine.downloadProgress.collectAsState()
                val isGenerating by repository.localLlmEngine.isGenerating.collectAsState()

                // Automatic initial biometric prompt if enabled and locked
                LaunchedEffect(biometricEnabled, isUnlocked) {
                    if (biometricEnabled && !isUnlocked) {
                        repository.biometricAuthManager.authenticate(
                            activity = this@MainActivity,
                            onSuccess = {},
                            onError = {}
                        )
                    }
                }

                if (biometricEnabled && !isUnlocked) {
                    BiometricLockScreen(
                        statusMessage = repository.biometricAuthManager.getBiometricStatusMessage(),
                        onAuthenticateBiometric = {
                            repository.biometricAuthManager.authenticate(
                                activity = this@MainActivity,
                                onSuccess = {},
                                onError = {}
                            )
                        },
                        onUnlockWithPin = { pin ->
                            repository.biometricAuthManager.unlockWithPasscode(pin)
                        }
                    )
                } else {
                    NavHost(
                        navController = navController,
                        startDestination = "home",
                        modifier = Modifier.background(NavyBackground)
                    ) {
                        composable("home") {
                            HomeScreen(
                                isOnline = isOnline,
                                pendingSyncCount = pendingSyncCount,
                                activeModel = selectedModel,
                                cases = cases,
                                isBiometricUnlocked = isUnlocked,
                                onNavigateToCases = { navController.navigate("cases") },
                                onNavigateToDocuments = { navController.navigate("documents") },
                                onNavigateToLlmModels = { navController.navigate("llm_models") },
                                onNavigateToSyncStatus = { navController.navigate("sync_status") },
                                onNavigateToSettings = { navController.navigate("settings") },
                                onLockApp = { repository.biometricAuthManager.lock() }
                            )
                        }

                        composable("cases") {
                            CasesScreen(
                                cases = cases,
                                onCreateCase = { title, clientName, caseType, description, tags ->
                                    lifecycleScope.launch {
                                        repository.createCase(title, clientName, caseType, description, tags)
                                    }
                                },
                                onSelectCase = { caseId ->
                                    navController.navigate("case_details/$caseId")
                                },
                                onDeleteCase = { caseId ->
                                    lifecycleScope.launch { repository.deleteCase(caseId) }
                                },
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable(
                            route = "case_details/{caseId}",
                            arguments = listOf(navArgument("caseId") { type = NavType.StringType })
                        ) { backStackEntry ->
                            val caseId = backStackEntry.arguments?.getString("caseId") ?: ""
                            val currentCase by repository.getCaseById(caseId).collectAsState(initial = null)
                            val caseDocs by repository.getDocumentsByCase(caseId).collectAsState(initial = emptyList())
                            val chatMessages by repository.getChatMessages(caseId).collectAsState(initial = emptyList())

                            CaseDetailsScreen(
                                caseFolder = currentCase,
                                documents = caseDocs,
                                chatMessages = chatMessages,
                                isGenerating = isGenerating,
                                onSendMessage = { query, perspective ->
                                    lifecycleScope.launch {
                                        repository.sendChatMessage(caseId, query, perspective, currentCase?.caseType ?: "criminal")
                                    }
                                },
                                onRunRiskAnalysis = {
                                    lifecycleScope.launch { repository.runRiskAnalysis(caseId) }
                                },
                                onRunTimeline = {
                                    lifecycleScope.launch { repository.runTimelineAnalysis(caseId) }
                                },
                                onRunContradictionScan = {
                                    lifecycleScope.launch { repository.runContradictionScan(caseId) }
                                },
                                onRunEntityIndexing = {
                                    lifecycleScope.launch { repository.runEntityIndexing(caseId) }
                                },
                                onRunHearingPrep = {
                                    lifecycleScope.launch { repository.runHearingPrep(caseId) }
                                },
                                onGenerateDraft = { templateType ->
                                    lifecycleScope.launch {
                                        repository.localLlmEngine.generateDraft(templateType, currentCase?.clientName ?: "Client", "Opponent Party")
                                    }
                                },
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable("documents") {
                            DocumentsScreen(
                                documents = documents,
                                cases = cases,
                                onAddDocument = { caseId, name, fileUri, text ->
                                    lifecycleScope.launch {
                                        repository.addDocument(caseId, name, fileUri, text)
                                    }
                                },
                                onSelectDocument = { docId ->
                                    navController.navigate("document_details/$docId")
                                },
                                onDeleteDocument = { docId ->
                                    lifecycleScope.launch { repository.deleteDocument(docId) }
                                },
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable(
                            route = "document_details/{docId}",
                            arguments = listOf(navArgument("docId") { type = NavType.StringType })
                        ) { backStackEntry ->
                            val docId = backStackEntry.arguments?.getString("docId") ?: ""
                            val doc by repository.getDocumentById(docId).collectAsState(initial = null)

                            DocumentDetailsScreen(
                                document = doc,
                                onRunSummary = {
                                    lifecycleScope.launch {
                                        if (doc != null) {
                                            repository.localLlmEngine.generateSummary(doc!!.fullText, "criminal")
                                        }
                                    }
                                },
                                onQueryDocument = {},
                                isGenerating = isGenerating,
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable("llm_models") {
                            LlmModelsScreen(
                                models = models,
                                downloadProgressMap = downloadProgressMap,
                                onDownloadModel = { modelId ->
                                    lifecycleScope.launch {
                                        repository.localLlmEngine.downloadModel(modelId) {}
                                    }
                                },
                                onSelectModel = { modelId ->
                                    lifecycleScope.launch {
                                        repository.localLlmEngine.selectModel(modelId)
                                    }
                                },
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable("sync_status") {
                            SyncStatusScreen(
                                isOnline = isOnline,
                                pendingCount = pendingSyncCount,
                                onTriggerSync = {
                                    lifecycleScope.launch { repository.syncPendingQueue() }
                                },
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }

                        composable("settings") {
                            SettingsScreen(
                                biometricEnabled = biometricEnabled,
                                onToggleBiometric = { enabled ->
                                    repository.biometricAuthManager.setBiometricEnabled(enabled)
                                },
                                onWipeData = {
                                    lifecycleScope.launch { repository.wipeAllLocalData() }
                                },
                                onNavigateToLlmHub = { navController.navigate("llm_models") },
                                onNavigateBack = { navController.popBackStack() }
                            )
                        }
                    }
                }
            }
        }
    }
}
