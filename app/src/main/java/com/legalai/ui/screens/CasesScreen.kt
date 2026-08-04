package com.legalai.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.navigation.NavController
import com.legalai.data.model.Case
import com.legalai.ui.theme.*
import com.legalai.ui.viewmodel.CaseViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CasesScreen(navController: NavController, viewModel: CaseViewModel) {
    val cases by viewModel.allCases.collectAsState()
    var showAddDialog by remember { mutableStateOf(false) }
    var selectedTagFilter by remember { mutableStateOf("All") }

    // Dialog input fields
    var title by remember { mutableStateOf("") }
    var clientName by remember { mutableStateOf("") }
    var court by remember { mutableStateOf("") }
    var caseType by remember { mutableStateOf("Civil") }
    var status by remember { mutableStateOf("consultation") }
    var nextHearingDate by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var tags by remember { mutableStateOf("") }

    val tagsList = listOf("All", "Urgent", "Hearing Tomorrow", "Evidence Pending", "Draft Required")

    val filteredCases = cases.filter { c ->
        selectedTagFilter == "All" || c.tags.contains(selectedTagFilter, ignoreCase = true)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Case Workspace", color = TextPrimary, fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Background),
                actions = {
                    IconButton(onClick = { showAddDialog = true }) {
                        Icon(Icons.Default.Add, contentDescription = "Add Case", tint = Primary)
                    }
                }
            )
        },
        containerColor = Background,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = Primary,
                contentColor = Background
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add Case")
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp)
        ) {
            // Horizontal Tag Filter Row
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 12.dp)
            ) {
                items(tagsList) { tag ->
                    val isSelected = selectedTagFilter == tag
                    SuggestionChip(
                        onClick = { selectedTagFilter = tag },
                        label = { Text(tag) },
                        colors = SuggestionChipDefaults.suggestionChipColors(
                            containerColor = if (isSelected) Primary else Surface,
                            labelColor = if (isSelected) Background else TextPrimary
                        ),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isSelected) Primary else Border
                        )
                    )
                }
            }

            if (filteredCases.isEmpty()) {
                Box(
                    modifier = Modifier.fillMaxSize().weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No cases found.", color = TextSecondary, fontSize = 16.sp)
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f)
                        .padding(bottom = 16.dp)
                ) {
                    items(filteredCases) { c ->
                        CaseCard(
                            case = c,
                            onCardClick = {
                                viewModel.selectCase(c.id)
                                navController.navigate("case_details/${c.id}")
                            },
                            onDeleteClick = { viewModel.deleteCase(c) }
                        )
                    }
                }
            }
        }
    }

    // Add Case Modal dialog
    if (showAddDialog) {
        Dialog(onDismissRequest = { showAddDialog = false }) {
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
                        text = "New Case Folder",
                        fontSize = 20.sp,
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    TextField(
                        value = title,
                        onValueChange = { title = it },
                        label = { Text("Case Title") },
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
                        value = clientName,
                        onValueChange = { clientName = it },
                        label = { Text("Client Name") },
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
                        value = court,
                        onValueChange = { court = it },
                        label = { Text("Court / Forum") },
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
                        value = tags,
                        onValueChange = { tags = it },
                        label = { Text("Tags (comma separated e.g. Urgent)") },
                        modifier = Modifier.fillMaxWidth(),
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
                        TextButton(onClick = { showAddDialog = false }) {
                            Text("Cancel", color = TextSecondary)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = {
                                if (title.isNotBlank() && clientName.isNotBlank() && court.isNotBlank()) {
                                    viewModel.addCase(
                                        title = title,
                                        clientName = clientName,
                                        court = court,
                                        caseType = caseType,
                                        status = status,
                                        nextHearingDate = nextHearingDate,
                                        notes = notes,
                                        tags = tags
                                    )
                                    // Reset fields
                                    title = ""
                                    clientName = ""
                                    court = ""
                                    tags = ""
                                    showAddDialog = false
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Primary)
                        ) {
                            Text("Create", color = Background)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CaseCard(case: Case, onCardClick: () -> Unit, onDeleteClick: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = Surface),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onCardClick() }
    ) {
        Row(
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = case.title,
                    color = TextPrimary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Client: ${case.clientName} | Court: ${case.court}",
                    color = TextSecondary,
                    fontSize = 14.sp
                )
                if (case.tags.isNotBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Box(
                        modifier = Modifier
                            .background(PrimaryVariant.copy(alpha = 0.3f), RoundedCornerShape(4.dp))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text(case.tags, color = Primary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
            IconButton(onClick = onDeleteClick) {
                Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Error)
            }
        }
    }
}
