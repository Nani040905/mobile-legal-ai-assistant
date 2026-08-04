package com.legalai

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.legalai.ui.screens.CaseDetailsScreen
import com.legalai.ui.screens.CasesScreen
import com.legalai.ui.screens.ChatScreen
import com.legalai.ui.screens.HomeScreen
import com.legalai.ui.screens.SettingsScreen
import com.legalai.ui.theme.LegalAITheme
import com.legalai.ui.viewmodel.CaseViewModel
import com.legalai.ui.viewmodel.CaseViewModelFactory
import com.legalai.ui.viewmodel.ChatViewModel
import com.legalai.ui.viewmodel.ChatViewModelFactory

class MainActivity : ComponentActivity() {

    private val caseViewModel: CaseViewModel by viewModels {
        val app = application as MainApplication
        CaseViewModelFactory(app.caseRepository, app.documentRepository)
    }

    private val chatViewModel: ChatViewModel by viewModels {
        val app = application as MainApplication
        ChatViewModelFactory(app.messageRepository)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            LegalAITheme {
                AppNavigation()
            }
        }
    }

    @Composable
    fun AppNavigation() {
        val navController = rememberNavController()
        NavHost(navController = navController, startDestination = "home") {
            composable("home") {
                HomeScreen(navController)
            }
            composable("cases") {
                CasesScreen(navController, caseViewModel)
            }
            composable("case_details/{caseId}") { backStackEntry ->
                val caseId = backStackEntry.arguments?.getString("caseId") ?: ""
                CaseDetailsScreen(navController, caseViewModel, caseId)
            }
            composable("chat/{caseId}") { backStackEntry ->
                val caseId = backStackEntry.arguments?.getString("caseId") ?: ""
                ChatScreen(navController, chatViewModel, caseId)
            }
            composable("settings") {
                SettingsScreen(navController, caseViewModel)
            }
        }
    }
}
