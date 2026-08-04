package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.entity.CaseFolderEntity
import com.example.data.local.entity.LlmModelEntity
import com.example.ui.theme.*

data class ActionTile(
    val title: String,
    val subtitle: String,
    val icon: ImageVector,
    val tag: String,
    val onClick: () -> Unit
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    isOnline: Boolean,
    pendingSyncCount: Int,
    activeModel: LlmModelEntity?,
    cases: List<CaseFolderEntity>,
    isBiometricUnlocked: Boolean,
    onNavigateToCases: () -> Unit,
    onNavigateToDocuments: () -> Unit,
    onNavigateToLlmModels: () -> Unit,
    onNavigateToSyncStatus: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onLockApp: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .background(GoldPrimary.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Gavel,
                                contentDescription = "Logo",
                                tint = GoldPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Legal AI",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextLight
                            )
                            Text(
                                text = "On-Device Privacy Engine",
                                fontSize = 11.sp,
                                color = TextMuted
                            )
                        }
                    }
                },
                actions = {
                    IconButton(
                        onClick = onNavigateToSyncStatus,
                        modifier = Modifier.testTag("sync_status_button")
                    ) {
                        BadgedBox(
                            badge = {
                                if (pendingSyncCount > 0) {
                                    Badge(containerColor = StatusOrange) {
                                        Text("$pendingSyncCount", color = Color.White)
                                    }
                                }
                            }
                        ) {
                            Icon(
                                imageVector = if (isOnline) Icons.Default.CloudDone else Icons.Default.CloudOff,
                                contentDescription = "Sync",
                                tint = if (isOnline) StatusGreen else StatusOrange
                            )
                        }
                    }
                    IconButton(
                        onClick = onLockApp,
                        modifier = Modifier.testTag("lock_app_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Fingerprint,
                            contentDescription = "Lock",
                            tint = GoldPrimary
                        )
                    }
                    IconButton(
                        onClick = onNavigateToSettings,
                        modifier = Modifier.testTag("settings_button")
                    ) {
                        Icon(
                            imageVector = Icons.Default.Settings,
                            contentDescription = "Settings",
                            tint = TextLight
                        )
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
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Network & Sync Status Banner
            item {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { onNavigateToSyncStatus() },
                    color = if (isOnline) NavySurfaceHigh else NavySurface,
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (isOnline) StatusGreen.copy(alpha = 0.5f) else StatusOrange.copy(alpha = 0.5f)
                    )
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(if (isOnline) StatusGreen else StatusOrange)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = if (isOnline) "Cloud Sync Ready" else "Offline Mode — Maximum Privacy",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = TextLight
                            )
                            Text(
                                text = if (isOnline) {
                                    if (pendingSyncCount > 0) "Auto-syncing $pendingSyncCount pending items..." else "All case records synchronized"
                                } else "All LLM inference and document processing run 100% locally.",
                                fontSize = 11.sp,
                                color = TextMuted
                            )
                        }
                        Icon(
                            imageVector = Icons.Default.ChevronRight,
                            contentDescription = null,
                            tint = TextMuted
                        )
                    }
                }
            }

            // Active Local LLM Card
            item {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .border(1.dp, GoldPrimary.copy(alpha = 0.3f), RoundedCornerShape(16.dp)),
                    color = NavySurface
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Memory,
                                    contentDescription = null,
                                    tint = GoldPrimary,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Active Local Model",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = GoldPrimary
                                )
                            }
                            TextButton(
                                onClick = onNavigateToLlmModels,
                                modifier = Modifier.testTag("swap_model_button")
                            ) {
                                Text("Swap Model (3)", fontSize = 12.sp, color = GoldPrimary)
                            }
                        }

                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = activeModel?.name ?: "Qwen 2.5 3B Legal Instruct",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextLight
                        )
                        Text(
                            text = activeModel?.description ?: "1.96 GB • On-Device Neural Model for Indian Law",
                            fontSize = 12.sp,
                            color = TextMuted,
                            modifier = Modifier.padding(top = 2.dp)
                        )
                    }
                }
            }

            // Core Action Tiles
            item {
                Text(
                    text = "Case Workspace & AI Tools",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = MutedBlue,
                    modifier = Modifier.padding(vertical = 4.dp)
                )

                val tiles = listOf(
                    ActionTile(
                        title = "Case Folders",
                        subtitle = "${cases.size} Active Cases",
                        icon = Icons.Default.Folder,
                        tag = "tile_cases",
                        onClick = onNavigateToCases
                    ),
                    ActionTile(
                        title = "Document Hub",
                        subtitle = "PDF/TXT Extraction",
                        icon = Icons.Default.Description,
                        tag = "tile_documents",
                        onClick = onNavigateToDocuments
                    ),
                    ActionTile(
                        title = "Local LLMs",
                        subtitle = "3 Models Swappable",
                        icon = Icons.Default.Psychology,
                        tag = "tile_llms",
                        onClick = onNavigateToLlmModels
                    ),
                    ActionTile(
                        title = "Cloud Auto-Sync",
                        subtitle = if (pendingSyncCount > 0) "$pendingSyncCount Pending" else "Up to date",
                        icon = Icons.Default.Sync,
                        tag = "tile_sync",
                        onClick = onNavigateToSyncStatus
                    )
                )

                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        HomeTileItem(tile = tiles[0], modifier = Modifier.weight(1f))
                        HomeTileItem(tile = tiles[1], modifier = Modifier.weight(1f))
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        HomeTileItem(tile = tiles[2], modifier = Modifier.weight(1f))
                        HomeTileItem(tile = tiles[3], modifier = Modifier.weight(1f))
                    }
                }
            }

            // Recent Active Cases
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Recent Case Files",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = MutedBlue
                    )
                    TextButton(onClick = onNavigateToCases) {
                        Text("View All", fontSize = 12.sp, color = GoldPrimary)
                    }
                }
            }

            if (cases.isEmpty()) {
                item {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp)),
                        color = NavySurface
                    ) {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Outlined.FolderOpen,
                                contentDescription = null,
                                tint = TextMuted,
                                modifier = Modifier.size(36.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "No cases created yet",
                                fontSize = 14.sp,
                                color = TextMuted
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(
                                onClick = onNavigateToCases,
                                colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary)
                            ) {
                                Text("Create First Case", color = NavyBackground)
                            }
                        }
                    }
                }
            } else {
                items(cases.take(3).size) { index ->
                    val item = cases[index]
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 8.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .clickable { onNavigateToCases() },
                        color = NavySurface
                    ) {
                        Row(
                            modifier = Modifier.padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(NavySurfaceHigh),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.FolderSpecial,
                                    contentDescription = null,
                                    tint = GoldPrimary
                                )
                            }
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = item.title,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextLight
                                )
                                Text(
                                    text = "Client: ${item.clientName} • ${item.caseType.uppercase()}",
                                    fontSize = 11.sp,
                                    color = TextMuted
                                )
                            }
                            AssistChip(
                                onClick = {},
                                label = { Text(item.status, fontSize = 10.sp) }
                            )
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(24.dp)) }
        }
    }
}

@Composable
fun HomeTileItem(tile: ActionTile, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier
            .testTag(tile.tag)
            .clip(RoundedCornerShape(12.dp))
            .clickable { tile.onClick() },
        color = NavySurface,
        border = androidx.compose.foundation.BorderStroke(1.dp, NavySurfaceHigh)
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(GoldPrimary.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = tile.icon,
                    contentDescription = null,
                    tint = GoldPrimary,
                    modifier = Modifier.size(20.dp)
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                text = tile.title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = TextLight
            )
            Text(
                text = tile.subtitle,
                fontSize = 11.sp,
                color = TextMuted
            )
        }
    }
}
