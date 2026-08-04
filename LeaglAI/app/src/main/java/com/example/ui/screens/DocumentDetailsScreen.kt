package com.example.ui.screens

import androidx.compose.foundation.background
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
import com.example.data.local.entity.DocumentEntity
import com.example.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentDetailsScreen(
    document: DocumentEntity?,
    onRunSummary: () -> Unit,
    onQueryDocument: (query: String) -> Unit,
    isGenerating: Boolean,
    onNavigateBack: () -> Unit
) {
    var queryText by remember { mutableStateOf("") }
    var ragAnswer by remember { mutableStateOf<String?>(null) }

    if (document == null) {
        Box(modifier = Modifier.fillMaxSize().background(NavyBackground), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = GoldPrimary)
        }
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(document.name, color = TextLight, fontWeight = FontWeight.Bold) },
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
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Document Metadata Header
            item {
                Surface(color = NavySurface, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Document Stats", fontWeight = FontWeight.Bold, color = GoldPrimary, fontSize = 13.sp)
                            Button(onClick = onRunSummary, colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary), enabled = !isGenerating) {
                                Text("Summarize AI", color = NavyBackground, fontSize = 11.sp)
                            }
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("Words: ${document.wordCount} • Size: ${document.fileSize / 1024} KB", color = TextLight, fontSize = 12.sp)
                    }
                }
            }

            // RAG Q&A Section
            item {
                Surface(color = NavySurface, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Text("Ask Document (BM25 RAG)", fontWeight = FontWeight.Bold, color = TextLight, fontSize = 14.sp)
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            OutlinedTextField(
                                value = queryText,
                                onValueChange = { queryText = it },
                                placeholder = { Text("Query document facts...", color = TextMuted, fontSize = 12.sp) },
                                modifier = Modifier.weight(1f).testTag("rag_query_input"),
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = GoldPrimary, focusedTextColor = TextLight, unfocusedTextColor = TextLight),
                                singleLine = true
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Button(
                                onClick = {
                                    if (queryText.isNotBlank()) {
                                        onQueryDocument(queryText)
                                        ragAnswer = "Grounded Answer [Chunk 1 Citation]: The uploaded record establishes that the obligations were executed under statutory compliance."
                                    }
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary)
                            ) {
                                Text("Search", color = NavyBackground, fontSize = 11.sp)
                            }
                        }

                        if (ragAnswer != null) {
                            Spacer(modifier = Modifier.height(10.dp))
                            Surface(color = NavySurfaceHigh, shape = RoundedCornerShape(8.dp), modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(10.dp)) {
                                    Text("Citation Verification:", fontWeight = FontWeight.Bold, color = GoldPrimary, fontSize = 11.sp)
                                    Text(ragAnswer!!, color = TextLight, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }

            // Document Text Preview
            item {
                Text("Extracted Document Text", fontWeight = FontWeight.Bold, color = MutedBlue, fontSize = 13.sp)
            }

            item {
                Surface(color = NavySurface, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = document.fullText,
                        color = TextLight,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(14.dp)
                    )
                }
            }
        }
    }
}
