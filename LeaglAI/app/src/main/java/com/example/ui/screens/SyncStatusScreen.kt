package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SyncStatusScreen(
    isOnline: Boolean,
    pendingCount: Int,
    onTriggerSync: () -> Unit,
    onNavigateBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Cloud Auto-Sync Monitor", color = TextLight, fontWeight = FontWeight.Bold) },
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Surface(
                color = NavySurface,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(12.dp)
                                    .clip(CircleShape)
                                    .background(if (isOnline) StatusGreen else StatusOrange)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = if (isOnline) "Internet Connected" else "Offline Mode Active",
                                fontWeight = FontWeight.Bold,
                                color = TextLight,
                                fontSize = 15.sp
                            )
                        }
                        AssistChip(
                            onClick = {},
                            label = { Text(if (isOnline) "SYNC READY" else "SAVED LOCALLY", fontSize = 10.sp) },
                            colors = AssistChipDefaults.assistChipColors(
                                containerColor = if (isOnline) StatusGreen.copy(alpha = 0.2f) else StatusOrange.copy(alpha = 0.2f),
                                labelColor = if (isOnline) StatusGreen else StatusOrange
                            )
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "Pending Offline Sync Tasks: $pendingCount items queued",
                        color = TextMuted,
                        fontSize = 13.sp
                    )

                    Spacer(modifier = Modifier.height(14.dp))
                    Button(
                        onClick = onTriggerSync,
                        enabled = isOnline && pendingCount > 0,
                        colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary),
                        modifier = Modifier.fillMaxWidth().testTag("manual_sync_button")
                    ) {
                        Icon(Icons.Default.Sync, contentDescription = null, tint = NavyBackground)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Trigger Cloud Sync Now", color = NavyBackground, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Text("Sync Architecture Protocol", fontWeight = FontWeight.Bold, color = MutedBlue, fontSize = 13.sp)

            Surface(
                color = NavySurface,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("1. Offline-First Storage: All case entries, chat sessions, and AI summaries are immediately persisted to Room SQLite database.", fontSize = 12.sp, color = TextLight)
                    Text("2. Network Observer: Android ConnectivityManager detects connection transitions.", fontSize = 12.sp, color = TextLight)
                    Text("3. Auto-Sync Trigger: Pending offline queue entries auto-sync silently in background as soon as connectivity is restored.", fontSize = 12.sp, color = TextLight)
                }
            }
        }
    }
}
