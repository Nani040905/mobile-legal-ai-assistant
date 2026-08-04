package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import com.example.data.local.entity.LlmModelEntity
import com.example.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LlmModelsScreen(
    models: List<LlmModelEntity>,
    downloadProgressMap: Map<String, Float>,
    onDownloadModel: (modelId: String) -> Unit,
    onSelectModel: (modelId: String) -> Unit,
    onNavigateBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Local LLM Download & Swap Hub", color = TextLight, fontWeight = FontWeight.Bold, fontSize = 16.sp) },
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
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item {
                Surface(
                    color = NavySurface,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Security, contentDescription = null, tint = GoldPrimary, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("100% On-Device Privacy Guarantee", fontWeight = FontWeight.Bold, color = GoldPrimary, fontSize = 13.sp)
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Download local GGUF models directly to device storage. Switch seamlessly between reasoning, speed, or lightweight models without sending data to external servers.",
                            color = TextMuted,
                            fontSize = 11.sp
                        )
                    }
                }
            }

            items(models, key = { it.id }) { model ->
                val progress = downloadProgressMap[model.id]
                LlmModelCardItem(
                    model = model,
                    downloadProgress = progress,
                    onDownload = { onDownloadModel(model.id) },
                    onSelect = { onSelectModel(model.id) }
                )
            }
        }
    }
}

@Composable
fun LlmModelCardItem(
    model: LlmModelEntity,
    downloadProgress: Float?,
    onDownload: () -> Unit,
    onSelect: () -> Unit
) {
    val isDownloading = downloadProgress != null

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .border(
                1.dp,
                if (model.isSelected) GoldPrimary else NavySurfaceHigh,
                RoundedCornerShape(14.dp)
            ),
        color = NavySurface
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = model.name,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextLight
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        if (model.isSelected) {
                            AssistChip(
                                onClick = {},
                                label = { Text("ACTIVE", fontSize = 9.sp, fontWeight = FontWeight.Bold) },
                                colors = AssistChipDefaults.assistChipColors(containerColor = GoldPrimary, labelColor = NavyBackground)
                            )
                        }
                    }
                    Text(
                        text = "${model.parameterSize} • File Size: ${model.sizeLabel}",
                        fontSize = 11.sp,
                        color = MutedBlue,
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = model.description,
                fontSize = 12.sp,
                color = TextMuted
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = "Best For: ${model.bestFor}",
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = GoldPrimary
            )

            Spacer(modifier = Modifier.height(12.dp))

            if (isDownloading) {
                Column {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Downloading GGUF Model Weights...", fontSize = 11.sp, color = GoldPrimary)
                        Text("${((downloadProgress ?: 0f) * 100).toInt()}%", fontSize = 11.sp, color = TextLight)
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    LinearProgressIndicator(
                        progress = { downloadProgress ?: 0f },
                        modifier = Modifier.fillMaxWidth().height(6.dp).clip(RoundedCornerShape(3.dp)),
                        color = GoldPrimary,
                        trackColor = NavySurfaceHigh
                    )
                }
            } else {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (model.isDownloaded) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = StatusGreen, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Downloaded On Device", fontSize = 11.sp, color = StatusGreen)
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Button(
                            onClick = onSelect,
                            enabled = !model.isSelected,
                            colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary),
                            modifier = Modifier.testTag("select_model_${model.id}")
                        ) {
                            Text(if (model.isSelected) "Active Engine" else "Swap To This Model", color = NavyBackground, fontSize = 11.sp)
                        }
                    } else {
                        Button(
                            onClick = onDownload,
                            colors = ButtonDefaults.buttonColors(containerColor = NavySurfaceHigh),
                            modifier = Modifier.testTag("download_model_${model.id}")
                        ) {
                            Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(14.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Download (${model.sizeLabel})", color = TextLight, fontSize = 11.sp)
                        }
                    }
                }
            }
        }
    }
}
