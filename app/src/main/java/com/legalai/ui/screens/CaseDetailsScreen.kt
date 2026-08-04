package com.legalai.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.navigation.NavController
import com.legalai.data.model.Case
import com.legalai.data.model.Document
import com.legalai.ui.theme.*
import com.legalai.ui.viewmodel.CaseViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CaseDetailsScreen(navController: NavController, viewModel: CaseViewModel, caseId: String) {
    val cases by viewModel.allCases.collectAsState()
    val documents by viewModel.selectedCaseDocuments.collectAsState()
    val selectedCase = cases.find { it.id == caseId }

    var showAddDocDialog by remember { mutableStateOf(false) }
    var docName by remember { mutableStateOf("") }
    var docContent by remember { mutableStateOf("") }

    if (selectedCase == null) {
        Box(
            modifier = Modifier.fillMaxSize().background(Background),
            contentAlignment = Alignment.Center
        ) {
            Text("Case folder not found", color = TextSecondary)
        }
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(selectedCase.title, color = TextPrimary, fontWeight = FontWeight.Bold) },
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
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Case Information Card
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Surface),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text("CLIENT", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text(selectedCase.clientName, color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                        Spacer(modifier = Modifier.height(12.dp))

                        Text("COURT", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text(selectedCase.court, color = TextPrimary, fontSize = 16.sp)
                        Spacer(modifier = Modifier.height(12.dp))

                        Text("STATUS", color = TextMuted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        Text(selectedCase.status.uppercase(), color = Primary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Attached Documents Header
            item {
                Row(
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Documents", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    IconButton(onClick = { showAddDocDialog = true }) {
                        Icon(Icons.Default.Add, contentDescription = "Add Document", tint = Primary)
                    }
                }
            }

            // List of Documents
            if (documents.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(80.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("No documents uploaded yet.", color = TextMuted, fontSize = 14.sp)
                    }
                }
            } else {
                items(documents) { doc ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = SurfaceVariant),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp)
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(doc.name, color = TextPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text("Uploaded: ${doc.uploadedAt}", color = TextSecondary, fontSize = 12.sp)
                            }
                            IconButton(onClick = { viewModel.deleteDocument(doc) }) {
                                Icon(Icons.Default.Delete, contentDescription = "Delete Document", tint = Error)
                            }
                        }
                    }
                }
            }

            // Launcher Tools Section
            item {
                Text("AI Workspace Tools", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
            }

            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Surface),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { navController.navigate("chat/${selectedCase.id}") }
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("💬", fontSize = 28.sp, modifier = Modifier.padding(end = 16.dp))
                        Column {
                            Text("Consult AI Counsel", color = TextPrimary, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
                            Text("Query documents and legal code interactively.", color = TextSecondary, fontSize = 13.sp)
                        }
                    }
                }
            }
            
            item { Spacer(modifier = Modifier.height(16.dp)) }
        }
    }

    // Add Document dialog
    if (showAddDocDialog) {
        Dialog(onDismissRequest = { showAddDocDialog = false }) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Surface,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Column(
                    modifier = Modifier
                        .padding(20.dp)
                        .background(Surface)
                ) {
                    Text(
                        text = "Add Case Document",
                        fontSize = 20.sp,
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    TextField(
                        value = docName,
                        onValueChange = { docName = it },
                        label = { Text("Document Name (e.g. Agreement.txt)") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = SurfaceVariant,
                            unfocusedContainerColor = SurfaceVariant,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary
                        )
                    )
                    Spacer(modifier = Modifier.height(8.dp))

                    TextField(
                        value = docContent,
                        onValueChange = { docContent = it },
                        label = { Text("Document Text Content") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(120.dp),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = SurfaceVariant,
                            unfocusedContainerColor = SurfaceVariant,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary
                        )
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        horizontalArrangement = Arrangement.End,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        TextButton(onClick = { showAddDocDialog = false }) {
                            Text("Cancel", color = TextSecondary)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = {
                                if (docName.isNotBlank() && docContent.isNotBlank()) {
                                    viewModel.addDocumentToCase(selectedCase.id, docName, docContent)
                                    docName = ""
                                    docContent = ""
                                    showAddDocDialog = false
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Primary)
                        ) {
                            Text("Add", color = Background)
                        }
                    }
                }
            }
        }
    }
}
