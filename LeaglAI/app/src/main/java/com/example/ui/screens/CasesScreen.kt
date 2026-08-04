package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.entity.CaseFolderEntity
import com.example.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CasesScreen(
    cases: List<CaseFolderEntity>,
    onCreateCase: (title: String, clientName: String, caseType: String, description: String, tags: List<String>) -> Unit,
    onSelectCase: (caseId: String) -> Unit,
    onDeleteCase: (caseId: String) -> Unit,
    onNavigateBack: () -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    var selectedStatusFilter by remember { mutableStateOf("ALL") }
    var showCreateDialog by remember { mutableStateOf(false) }

    val filteredCases = cases.filter { caseFolder ->
        val matchesSearch = caseFolder.title.contains(searchQuery, ignoreCase = true) ||
                caseFolder.clientName.contains(searchQuery, ignoreCase = true) ||
                caseFolder.caseType.contains(searchQuery, ignoreCase = true)
        val matchesStatus = when (selectedStatusFilter) {
            "ALL" -> true
            else -> caseFolder.status.equals(selectedStatusFilter, ignoreCase = true)
        }
        matchesSearch && matchesStatus
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Case Workspace", color = TextLight, fontWeight = FontWeight.Bold) },
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
                onClick = { showCreateDialog = true },
                containerColor = GoldPrimary,
                contentColor = NavyBackground,
                modifier = Modifier.testTag("create_case_fab")
            ) {
                Icon(Icons.Default.Add, contentDescription = "Create Case")
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
            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("case_search_input"),
                placeholder = { Text("Search case title, client, type...", color = TextMuted) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = MutedBlue) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = null, tint = TextMuted)
                        }
                    }
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = GoldPrimary,
                    unfocusedBorderColor = NavySurfaceHigh,
                    focusedContainerColor = NavySurface,
                    unfocusedContainerColor = NavySurface,
                    focusedTextColor = TextLight,
                    unfocusedTextColor = TextLight
                ),
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Status Filter Chips
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                val filters = listOf("ALL", "Active", "On Hold", "Closed")
                items(filters) { filter ->
                    FilterChip(
                        selected = selectedStatusFilter == filter,
                        onClick = { selectedStatusFilter = filter },
                        label = { Text(filter) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = GoldPrimary,
                            selectedLabelColor = NavyBackground,
                            containerColor = NavySurface,
                            labelColor = TextLight
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Case List
            if (filteredCases.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.FolderOff,
                            contentDescription = null,
                            tint = TextMuted,
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = if (searchQuery.isNotBlank()) "No cases matching '$searchQuery'" else "No case folders registered",
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
                    items(filteredCases, key = { it.id }) { caseFolder ->
                        CaseCardItem(
                            caseFolder = caseFolder,
                            onClick = { onSelectCase(caseFolder.id) },
                            onDelete = { onDeleteCase(caseFolder.id) }
                        )
                    }
                }
            }
        }
    }

    // Create Case Dialog
    if (showCreateDialog) {
        CreateCaseDialog(
            onDismiss = { showCreateDialog = false },
            onCreate = { title, clientName, caseType, description, tags ->
                onCreateCase(title, clientName, caseType, description, tags)
                showCreateDialog = false
            }
        )
    }
}

@Composable
fun CaseCardItem(
    caseFolder: CaseFolderEntity,
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
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(GoldPrimary.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Folder,
                            contentDescription = null,
                            tint = GoldPrimary
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(
                            text = caseFolder.title,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextLight
                        )
                        Text(
                            text = "Client: ${caseFolder.clientName}",
                            fontSize = 12.sp,
                            color = TextMuted
                        )
                    }
                }
                IconButton(onClick = onDelete) {
                    Icon(
                        imageVector = Icons.Default.DeleteOutline,
                        contentDescription = "Delete",
                        tint = StatusRed.copy(alpha = 0.8f)
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    AssistChip(
                        onClick = {},
                        label = { Text(caseFolder.caseType.uppercase(), fontSize = 10.sp) },
                        colors = AssistChipDefaults.assistChipColors(containerColor = NavySurfaceHigh, labelColor = GoldPrimary)
                    )
                    AssistChip(
                        onClick = {},
                        label = { Text(caseFolder.status, fontSize = 10.sp) },
                        colors = AssistChipDefaults.assistChipColors(containerColor = NavySurfaceHigh, labelColor = TextLight)
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = if (caseFolder.isSynced) Icons.Default.CloudDone else Icons.Default.CloudQueue,
                        contentDescription = null,
                        tint = if (caseFolder.isSynced) StatusGreen else StatusOrange,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (caseFolder.isSynced) "Synced" else "Offline",
                        fontSize = 11.sp,
                        color = TextMuted
                    )
                }
            }
        }
    }
}

@Composable
fun CreateCaseDialog(
    onDismiss: () -> Unit,
    onCreate: (title: String, clientName: String, caseType: String, description: String, tags: List<String>) -> Unit
) {
    var title by remember { mutableStateOf("") }
    var clientName by remember { mutableStateOf("") }
    var caseType by remember { mutableStateOf("criminal") }
    var description by remember { mutableStateOf("") }

    val caseTypes = listOf("criminal", "civil", "contract", "corporate", "family", "property", "tax")

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = NavySurface,
        title = { Text("Create New Case Folder", color = TextLight, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(
                    value = title,
                    onValueChange = { title = it },
                    label = { Text("Case Title") },
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = GoldPrimary, focusedTextColor = TextLight, unfocusedTextColor = TextLight),
                    singleLine = true,
                    modifier = Modifier.testTag("new_case_title_input")
                )
                OutlinedTextField(
                    value = clientName,
                    onValueChange = { clientName = it },
                    label = { Text("Client Name") },
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = GoldPrimary, focusedTextColor = TextLight, unfocusedTextColor = TextLight),
                    singleLine = true
                )
                Text("Case Type Focus", fontSize = 12.sp, color = MutedBlue)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(caseTypes) { type ->
                        FilterChip(
                            selected = caseType == type,
                            onClick = { caseType = type },
                            label = { Text(type.uppercase(), fontSize = 10.sp) },
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = GoldPrimary, selectedLabelColor = NavyBackground, labelColor = TextLight)
                        )
                    }
                }
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description / Brief Summary") },
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = GoldPrimary, focusedTextColor = TextLight, unfocusedTextColor = TextLight),
                    maxLines = 3
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (title.isNotBlank()) {
                        onCreate(title, clientName, caseType, description, listOf("Urgent"))
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary)
            ) {
                Text("Create Folder", color = NavyBackground)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = TextMuted)
            }
        }
    )
}
