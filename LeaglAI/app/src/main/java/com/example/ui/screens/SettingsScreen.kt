package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    biometricEnabled: Boolean,
    onToggleBiometric: (Boolean) -> Unit,
    onWipeData: () -> Unit,
    onNavigateToLlmHub: () -> Unit,
    onNavigateBack: () -> Unit
) {
    var showWipeConfirmation by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings & Security", color = TextLight, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = TextLight)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = NavyBackground)
            )
        },
        containerColor = NavyBackground
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Biometric Security Card
            item {
                Surface(color = NavySurface, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Security & Privacy", fontWeight = FontWeight.Bold, color = GoldPrimary, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(12.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Biometric Authentication", fontWeight = FontWeight.SemiBold, color = TextLight, fontSize = 14.sp)
                                Text("Require Fingerprint / Face ID to access case files", color = TextMuted, fontSize = 11.sp)
                            }
                            Switch(
                                checked = biometricEnabled,
                                onCheckedChange = onToggleBiometric,
                                colors = SwitchDefaults.colors(checkedThumbColor = NavyBackground, checkedTrackColor = GoldPrimary),
                                modifier = Modifier.testTag("biometric_switch")
                            )
                        }
                    }
                }
            }

            // Local LLM Engine Card
            item {
                Surface(color = NavySurface, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("On-Device Processing", fontWeight = FontWeight.Bold, color = GoldPrimary, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Manage 3 local LLMs (Qwen 2.5 3B, Qwen 1.5B, Llama 3.2 1B)", color = TextMuted, fontSize = 12.sp)
                        Spacer(modifier = Modifier.height(10.dp))
                        Button(
                            onClick = onNavigateToLlmHub,
                            colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Open Local LLM Download Hub", color = NavyBackground, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }

            // Wipe Data
            item {
                Surface(color = NavySurface, shape = RoundedCornerShape(14.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("Data Management", fontWeight = FontWeight.Bold, color = StatusRed, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Permanently delete all local case files, documents, and chat records.", color = TextMuted, fontSize = 12.sp)
                        Spacer(modifier = Modifier.height(10.dp))
                        Button(
                            onClick = { showWipeConfirmation = true },
                            colors = ButtonDefaults.buttonColors(containerColor = StatusRed),
                            modifier = Modifier.fillMaxWidth().testTag("wipe_data_button")
                        ) {
                            Text("Wipe All Local Data", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }

    if (showWipeConfirmation) {
        AlertDialog(
            onDismissRequest = { showWipeConfirmation = false },
            containerColor = NavySurface,
            title = { Text("Confirm Data Purge", color = StatusRed, fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to permanently erase all local cases, documents, and chat histories? This operation cannot be undone.", color = TextLight, fontSize = 13.sp) },
            confirmButton = {
                Button(
                    onClick = {
                        onWipeData()
                        showWipeConfirmation = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = StatusRed)
                ) {
                    Text("Purge Everything", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showWipeConfirmation = false }) {
                    Text("Cancel", color = TextMuted)
                }
            }
        )
    }
}
