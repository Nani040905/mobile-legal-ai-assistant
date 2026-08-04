package com.example.ui.screens

import androidx.compose.foundation.background
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
import com.example.data.local.entity.CaseFolderEntity
import com.example.data.local.entity.DocumentEntity
import com.example.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DocumentsScreen(
    documents: List<DocumentEntity>,
    cases: List<CaseFolderEntity>,
    onAddDocument: (caseId: String?, name: String, fileUri: String, fullText: String) -> Unit,
    onSelectDocument: (docId: String) -> Unit,
    onDeleteDocument: (docId: String) -> Unit,
    onNavigateBack: () -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var showAddDialog by remember { mutableStateOf(false) }

    val filteredDocs = documents.filter {
        it.name.contains(searchQuery, ignoreCase = true) || it.fullText.contains(searchQuery, ignoreCase = true)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Document Hub", color = TextLight, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = TextLight)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = NavyBackground)
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = GoldPrimary,
                contentColor = NavyBackground,
                modifier = Modifier.testTag("upload_document_fab")
            ) {
                Icon(Icons.Default.NoteAdd, contentDescription = "Add Document")
            }
        },
        containerColor = NavyBackground
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp)
        ) {
            // Search Input
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.fillMaxWidth().testTag("doc_search_input"),
                placeholder = { Text("Search document title or keywords...", color = TextMuted) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = MutedBlue) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = GoldPrimary,
                    focusedTextColor = TextLight,
                    unfocusedTextColor = TextLight,
                    focusedContainerColor = NavySurface,
                    unfocusedContainerColor = NavySurface
                ),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(12.dp))

            if (filteredDocs.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxWidth().weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.Description,
                            contentDescription = null,
                            tint = TextMuted,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = if (searchQuery.isNotBlank()) "No documents matching '$searchQuery'" else "No legal documents imported",
                            color = TextMuted,
                            fontSize = 14.sp
                        )
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filteredDocs, key = { it.id }) { doc ->
                        DocumentCardItem(
                            doc = doc,
                            onClick = { onSelectDocument(doc.id) },
                            onDelete = { onDeleteDocument(doc.id) }
                        )
                    }
                }
            }
        }
    }

    if (showAddDialog) {
        AddDocumentDialog(
            cases = cases,
            onDismiss = { showAddDialog = false },
            onAdd = { caseId, name, text ->
                onAddDocument(caseId, name, "content://local/$name", text)
                showAddDialog = false
            }
        )
    }
}

@Composable
fun DocumentCardItem(
    doc: DocumentEntity,
    onClick: () -> Unit,
    onDelete: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .clickable { onClick() },
        color = NavySurface,
        border = androidx.compose.foundation.BorderStroke(1.dp, NavySurfaceHigh)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(GoldPrimary.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.PictureAsPdf,
                    contentDescription = null,
                    tint = GoldPrimary
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = doc.name,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextLight
                )
                Text(
                    text = "${doc.wordCount} words • ${doc.fileSize / 1024} KB",
                    fontSize = 11.sp,
                    color = TextMuted
                )
            }
            IconButton(onClick = onDelete) {
                Icon(
                    imageVector = Icons.Default.DeleteOutline,
                    contentDescription = "Delete",
                    tint = StatusRed.copy(alpha = 0.8f)
                )
            }
        }
    }
}

@Composable
fun AddDocumentDialog(
    cases: List<CaseFolderEntity>,
    onDismiss: () -> Unit,
    onAdd: (caseId: String?, name: String, text: String) -> Unit
) {
    var docName by remember { mutableStateOf("") }
    var fullText by remember { mutableStateOf("") }
    var selectedCaseId by remember { mutableStateOf<String?>(cases.firstOrNull()?.id) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = NavySurface,
        title = { Text("Import Legal Document", color = TextLight, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = docName,
                    onValueChange = { docName = it },
                    label = { Text("Document Title (e.g. ChargeSheet.pdf)") },
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = GoldPrimary, focusedTextColor = TextLight, unfocusedTextColor = TextLight),
                    singleLine = true,
                    modifier = Modifier.testTag("doc_title_input")
                )
                OutlinedTextField(
                    value = fullText,
                    onValueChange = { fullText = it },
                    label = { Text("Document Content / PDF Text") },
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = GoldPrimary, focusedTextColor = TextLight, unfocusedTextColor = TextLight),
                    maxLines = 6,
                    modifier = Modifier.testTag("doc_content_input")
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (docName.isNotBlank() && fullText.isNotBlank()) {
                        onAdd(selectedCaseId, docName, fullText)
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary)
            ) {
                Text("Save Document", color = NavyBackground)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = TextMuted)
            }
        }
    )
}
