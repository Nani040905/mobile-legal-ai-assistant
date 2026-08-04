package com.legalai.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import com.legalai.ui.theme.*
import com.legalai.ui.viewmodel.CaseViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(navController: NavController, viewModel: CaseViewModel) {
    val scrollState = rememberScrollState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings & Telemetry", color = TextPrimary, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = TextPrimary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Background)
            )
        },
        containerColor = Background
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp)
                .verticalScroll(scrollState),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Live Telemetry section
            Text("System Performance", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)

            Card(
                colors = CardDefaults.cardColors(containerColor = Surface),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("DEVICE RAM OVERHEAD", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Text("142 MB (Optimized)", color = Success, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(12.dp))

                    Text("AVERAGE SCANS LATENCY", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Text("84ms (Offline CPU Mode)", color = TextPrimary, fontSize = 15.sp)
                    Spacer(modifier = Modifier.height(12.dp))

                    Text("ACTIVE MODEL", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    Text("Llama-3-Legal-8B-Q4.gguf", color = Primary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                }
            }

            // Storage Controls
            Text("Storage & Diagnostics", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)

            Card(
                colors = CardDefaults.cardColors(containerColor = Surface),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Clear Case Database", color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Deletes all active cases, timelines, and message backups locally.", color = TextSecondary, fontSize = 13.sp)
                    Spacer(modifier = Modifier.height(12.dp))

                    Button(
                        onClick = { viewModel.clearAllData() },
                        colors = ButtonDefaults.buttonColors(containerColor = Error),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Delete All Data", color = TextPrimary)
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}
