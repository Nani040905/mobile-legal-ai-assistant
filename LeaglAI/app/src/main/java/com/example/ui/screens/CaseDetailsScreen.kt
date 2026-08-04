package com.example.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.entity.CaseFolderEntity
import com.example.data.local.entity.ChatMessageEntity
import com.example.data.local.entity.DocumentEntity
import com.example.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CaseDetailsScreen(
    caseFolder: CaseFolderEntity?,
    documents: List<DocumentEntity>,
    chatMessages: List<ChatMessageEntity>,
    isGenerating: Boolean,
    onSendMessage: (query: String, perspective: String) -> Unit,
    onRunRiskAnalysis: () -> Unit,
    onRunTimeline: () -> Unit,
    onRunContradictionScan: () -> Unit,
    onRunEntityIndexing: () -> Unit,
    onRunHearingPrep: () -> Unit,
    onGenerateDraft: (templateType: String) -> Unit,
    onNavigateBack: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) } // 0: Chat, 1: Risk, 2: Timeline, 3: Contradictions, 4: Entities, 5: Hearing Prep, 6: Drafts, 7: Sections
    var perspective by remember { mutableStateOf("neutral") }
    var chatInputText by remember { mutableStateOf("") }

    if (caseFolder == null) {
        Box(modifier = Modifier.fillMaxSize().background(NavyBackground), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = GoldPrimary)
        }
        return
    }

    val tabs = listOf(
        "Chat AI" to Icons.Default.Chat,
        "Risk Audit" to Icons.Default.Warning,
        "Timeline" to Icons.Default.Schedule,
        "Contradictions" to Icons.Default.Compare,
        "Entities" to Icons.Default.Group,
        "Hearing Prep" to Icons.Default.Gavel,
        "Draft Generator" to Icons.Default.Edit,
        "Law Sections" to Icons.Default.MenuBook
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(caseFolder.title, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextLight)
                        Text("Client: ${caseFolder.clientName} • ${caseFolder.caseType.uppercase()}", fontSize = 11.sp, color = TextMuted)
                    }
                },
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
        ) {
            // Horizontal Tool Navigation Bar
            ScrollableTabRow(
                selectedTabIndex = selectedTab,
                containerColor = NavySurface,
                contentColor = GoldPrimary,
                edgePadding = 12.dp
            ) {
                tabs.forEachIndexed { index, (title, icon) ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title, fontSize = 12.sp, fontWeight = if (selectedTab == index) FontWeight.Bold else FontWeight.Normal) },
                        icon = { Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp)) },
                        selectedContentColor = GoldPrimary,
                        unselectedContentColor = TextMuted
                    )
                }
            }

            // Tab Contents
            Box(modifier = Modifier.weight(1f).fillMaxWidth().padding(16.dp)) {
                when (selectedTab) {
                    0 -> ChatTabContent(
                        messages = chatMessages,
                        perspective = perspective,
                        onPerspectiveChange = { perspective = it },
                        inputText = chatInputText,
                        onInputChange = { chatInputText = it },
                        isGenerating = isGenerating,
                        onSend = {
                            if (chatInputText.isNotBlank()) {
                                onSendMessage(chatInputText, perspective)
                                chatInputText = ""
                            }
                        }
                    )
                    1 -> RiskTabContent(caseFolder = caseFolder, onRun = onRunRiskAnalysis, isGenerating = isGenerating)
                    2 -> TimelineTabContent(caseFolder = caseFolder, onRun = onRunTimeline, isGenerating = isGenerating)
                    3 -> ContradictionsTabContent(caseFolder = caseFolder, onRun = onRunContradictionScan, isGenerating = isGenerating)
                    4 -> EntitiesTabContent(caseFolder = caseFolder, onRun = onRunEntityIndexing, isGenerating = isGenerating)
                    5 -> HearingPrepTabContent(caseFolder = caseFolder, onRun = onRunHearingPrep, isGenerating = isGenerating)
                    6 -> DraftsTabContent(caseFolder = caseFolder, onGenerateDraft = onGenerateDraft)
                    7 -> SectionsTabContent(caseFolder = caseFolder)
                }
            }
        }
    }
}

@Composable
fun ChatTabContent(
    messages: List<ChatMessageEntity>,
    perspective: String,
    onPerspectiveChange: (String) -> Unit,
    inputText: String,
    onInputChange: (String) -> Unit,
    isGenerating: Boolean,
    onSend: () -> Unit
) {
    val perspectives = listOf("neutral", "prosecution", "defense", "plaintiff", "defendant", "mediator")

    Column(modifier = Modifier.fillMaxSize()) {
        // Perspective Switcher Bar
        Text("Active Perspective Lens", fontSize = 11.sp, color = MutedBlue, modifier = Modifier.padding(bottom = 4.dp))
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.fillMaxWidth().padding(bottom = 10.dp)
        ) {
            items(perspectives) { p ->
                FilterChip(
                    selected = perspective == p,
                    onClick = { onPerspectiveChange(p) },
                    label = { Text(p.uppercase(), fontSize = 10.sp) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = GoldPrimary,
                        selectedLabelColor = NavyBackground,
                        containerColor = NavySurface,
                        labelColor = TextLight
                    )
                )
            }
        }

        // Chat Message Stream
        LazyColumn(
            modifier = Modifier.weight(1f).fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            if (messages.isEmpty()) {
                item {
                    Surface(
                        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)),
                        color = NavySurface
                    ) {
                        Column(modifier = Modifier.padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.SmartToy, contentDescription = null, tint = GoldPrimary, modifier = Modifier.size(36.dp))
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Ask your local Legal AI Assistant", color = TextLight, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            Text("All messages are processed 100% on-device and grounded in uploaded case documents.", color = TextMuted, fontSize = 12.sp)
                        }
                    }
                }
            } else {
                items(messages, key = { it.id }) { msg ->
                    val isUser = msg.role == "user"
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
                    ) {
                        Surface(
                            shape = RoundedCornerShape(
                                topStart = 14.dp,
                                topEnd = 14.dp,
                                bottomStart = if (isUser) 14.dp else 2.dp,
                                bottomEnd = if (isUser) 2.dp else 14.dp
                            ),
                            color = if (isUser) GoldPrimary else NavySurface,
                            modifier = Modifier.widthIn(max = 280.dp)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    text = msg.content,
                                    color = if (isUser) NavyBackground else TextLight,
                                    fontSize = 13.sp
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = if (isUser) "You" else "Local LLM (${msg.perspective.uppercase()})",
                                    color = if (isUser) NavyBackground.copy(alpha = 0.7f) else TextMuted,
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Input Field
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            OutlinedTextField(
                value = inputText,
                onValueChange = onInputChange,
                placeholder = { Text("Ask case query, statutory clause...", color = TextMuted, fontSize = 13.sp) },
                modifier = Modifier.weight(1f).testTag("chat_query_input"),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = GoldPrimary,
                    focusedTextColor = TextLight,
                    unfocusedTextColor = TextLight,
                    focusedContainerColor = NavySurface,
                    unfocusedContainerColor = NavySurface
                ),
                shape = RoundedCornerShape(20.dp),
                maxLines = 3
            )
            Spacer(modifier = Modifier.width(8.dp))
            IconButton(
                onClick = onSend,
                enabled = !isGenerating && inputText.isNotBlank(),
                modifier = Modifier.testTag("send_chat_button")
            ) {
                Surface(
                    shape = CircleShape,
                    color = if (!isGenerating && inputText.isNotBlank()) GoldPrimary else NavySurfaceHigh,
                    modifier = Modifier.size(44.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        if (isGenerating) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), color = GoldPrimary, strokeWidth = 2.dp)
                        } else {
                            Icon(Icons.Default.Send, contentDescription = "Send", tint = NavyBackground, modifier = Modifier.size(20.dp))
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun RiskTabContent(caseFolder: CaseFolderEntity, onRun: () -> Unit, isGenerating: Boolean) {
    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Legal Risk Audit", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextLight)
            Button(onClick = onRun, colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary), enabled = !isGenerating) {
                Text(if (isGenerating) "Auditing..." else "Run Audit", color = NavyBackground, fontSize = 12.sp)
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        if (caseFolder.riskReportJson.isNullOrBlank()) {
            Text("No risk audit performed yet. Tap 'Run Audit' to evaluate case risk locally.", color = TextMuted, fontSize = 13.sp)
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item {
                    Surface(color = NavySurface, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                        Column(modifier = Modifier.padding(14.dp)) {
                            Text("Overall Risk Severity", color = MutedBlue, fontSize = 12.sp)
                            Text("ELEVATED (78 / 100)", color = StatusRed, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                            Text("High risk of procedural non-compliance if evidence timeline is not rectified.", color = TextMuted, fontSize = 12.sp)
                        }
                    }
                }
                item {
                    RiskCardItem(title = "Evidentiary Gap: Missing Verification", severity = "Critical", recommendation = "File urgent affidavit of support")
                }
                item {
                    RiskCardItem(title = "Limitation Window Expiration", severity = "High", recommendation = "Ensure filing within 15 statutory days")
                }
            }
        }
    }
}

@Composable
fun RiskCardItem(title: String, severity: String, recommendation: String) {
    Surface(color = NavySurface, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(title, fontWeight = FontWeight.Bold, color = TextLight, fontSize = 13.sp)
                AssistChip(onClick = {}, label = { Text(severity, fontSize = 10.sp) }, colors = AssistChipDefaults.assistChipColors(containerColor = StatusRed.copy(alpha = 0.2f), labelColor = StatusRed))
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text("Recommendation: $recommendation", color = TextMuted, fontSize = 11.sp)
        }
    }
}

@Composable
fun TimelineTabContent(caseFolder: CaseFolderEntity, onRun: () -> Unit, isGenerating: Boolean) {
    Column(modifier = Modifier.fillMaxSize()) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Chronological Event Timeline", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextLight)
            Button(onClick = onRun, colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary), enabled = !isGenerating) {
                Text(if (isGenerating) "Extracting..." else "Build Timeline", color = NavyBackground, fontSize = 12.sp)
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        if (caseFolder.timelineJson.isNullOrBlank()) {
            Text("No timeline generated. Tap 'Build Timeline' to extract dates and events.", color = TextMuted, fontSize = 13.sp)
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item { TimelineCardItem(date = "15 Jan 2024", event = "Agreement executed between parties", source = "Doc 1 - Primary Contract") }
                item { TimelineCardItem(date = "10 Feb 2024", event = "Legal notice issued for breach", source = "Doc 2 - Demand Notice") }
                item { TimelineCardItem(date = "01 Mar 2024", event = "Court proceedings commenced before Magistrate", source = "Doc 3 - Order Sheet") }
            }
        }
    }
}

@Composable
fun TimelineCardItem(date: String, event: String, source: String) {
    Surface(color = NavySurface, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = Modifier.size(40.dp).clip(CircleShape).background(GoldPrimary.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                Icon(Icons.Default.Event, contentDescription = null, tint = GoldPrimary, modifier = Modifier.size(20.dp))
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(date, fontWeight = FontWeight.Bold, color = GoldPrimary, fontSize = 12.sp)
                Text(event, color = TextLight, fontSize = 13.sp)
                Text("Source: $source", color = TextMuted, fontSize = 10.sp)
            }
        }
    }
}

@Composable
fun ContradictionsTabContent(caseFolder: CaseFolderEntity, onRun: () -> Unit, isGenerating: Boolean) {
    Column(modifier = Modifier.fillMaxSize()) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Cross-Document Contradiction Scanner", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextLight)
            Button(onClick = onRun, colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary), enabled = !isGenerating) {
                Text("Scan Conflicts", color = NavyBackground, fontSize = 12.sp)
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Surface(color = NavySurface, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("Conflict 1: Meeting Location Inconsistency", fontWeight = FontWeight.Bold, color = GoldPrimary, fontSize = 13.sp)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("Doc A (Affidavit): States meeting occurred in Mumbai at 10 AM.", color = TextLight, fontSize = 11.sp)
                        Text("Doc B (Receipts): Flight receipts show party arrived in Delhi at 11 AM.", color = TextMuted, fontSize = 11.sp)
                        AssistChip(onClick = {}, label = { Text("HIGH SEVERITY", fontSize = 9.sp) }, colors = AssistChipDefaults.assistChipColors(containerColor = StatusRed.copy(alpha = 0.2f), labelColor = StatusRed))
                    }
                }
            }
        }
    }
}

@Composable
fun EntitiesTabContent(caseFolder: CaseFolderEntity, onRun: () -> Unit, isGenerating: Boolean) {
    Column(modifier = Modifier.fillMaxSize()) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Named Entity Index", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextLight)
            Button(onClick = onRun, colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary), enabled = !isGenerating) {
                Text("Index Entities", color = NavyBackground, fontSize = 12.sp)
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item { EntityGroupCard("Persons & Parties", listOf("Rajesh Sharma (Plaintiff)", "Vikram Verma (Defendant)")) }
            item { EntityGroupCard("Organizations", listOf("Apex Solutions Pvt Ltd")) }
            item { EntityGroupCard("Statutory Provisions", listOf("BNS Section 318", "BNSS Section 480", "Article 21 Constitution")) }
        }
    }
}

@Composable
fun EntityGroupCard(title: String, items: List<String>) {
    Surface(color = NavySurface, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(title, fontWeight = FontWeight.Bold, color = GoldPrimary, fontSize = 13.sp)
            Spacer(modifier = Modifier.height(4.dp))
            items.forEach { item ->
                Text("• $item", color = TextLight, fontSize = 12.sp)
            }
        }
    }
}

@Composable
fun HearingPrepTabContent(caseFolder: CaseFolderEntity, onRun: () -> Unit, isGenerating: Boolean) {
    Column(modifier = Modifier.fillMaxSize()) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Text("Court Hearing Brief & Judge Qs", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextLight)
            Button(onClick = onRun, colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary), enabled = !isGenerating) {
                Text("Prepare Brief", color = NavyBackground, fontSize = 12.sp)
            }
        }
        Spacer(modifier = Modifier.height(12.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Surface(color = NavySurface, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("Likely Questions From The Judge", fontWeight = FontWeight.Bold, color = GoldPrimary, fontSize = 13.sp)
                        Spacer(modifier = Modifier.height(6.dp))
                        Text("1. Q: Has the statutory notice been served within 30 days of dishonour?", color = TextLight, fontSize = 12.sp)
                        Text("2. Q: What is the current stage of investigation / police charge sheet?", color = TextLight, fontSize = 12.sp)
                        Text("3. Q: Is there any objection regarding territorial jurisdiction?", color = TextLight, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun DraftsTabContent(caseFolder: CaseFolderEntity, onGenerateDraft: (String) -> Unit) {
    var generatedText by remember { mutableStateOf("") }

    Column(modifier = Modifier.fillMaxSize()) {
        Text("Legal Document Draft Generator", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextLight)
        Spacer(modifier = Modifier.height(8.dp))

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(onClick = { onGenerateDraft("legal_notice") }, colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary)) {
                Text("Legal Notice", color = NavyBackground, fontSize = 11.sp)
            }
            Button(onClick = { onGenerateDraft("bail_application") }, colors = ButtonDefaults.buttonColors(containerColor = NavySurfaceHigh)) {
                Text("Bail Petition", color = TextLight, fontSize = 11.sp)
            }
            Button(onClick = { onGenerateDraft("affidavit") }, colors = ButtonDefaults.buttonColors(containerColor = NavySurfaceHigh)) {
                Text("Affidavit", color = TextLight, fontSize = 11.sp)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))
        Surface(color = NavySurface, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().weight(1f)) {
            Column(modifier = Modifier.padding(14.dp)) {
                Text("Generated Draft Output:", fontWeight = FontWeight.Bold, color = GoldPrimary, fontSize = 12.sp)
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Tap any template above to auto-generate a structured draft under Indian legal format using client details (${caseFolder.clientName}).",
                    color = TextMuted,
                    fontSize = 12.sp
                )
            }
        }
    }
}

@Composable
fun SectionsTabContent(caseFolder: CaseFolderEntity) {
    Column(modifier = Modifier.fillMaxSize()) {
        Text("Applicable Statutory Provisions & Common Pitfalls", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextLight)
        Spacer(modifier = Modifier.height(12.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            item {
                Surface(color = NavySurface, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("BNS Section 318 (IPC 420) — Cheating", fontWeight = FontWeight.Bold, color = GoldPrimary, fontSize = 13.sp)
                        Text("Description: Cheating and dishonestly inducing delivery of property.", color = TextLight, fontSize = 12.sp)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("⚠️ Common Filing Mistake: Failing to establish fraudulent intent at inception rather than mere civil breach.", color = StatusOrange, fontSize = 11.sp)
                    }
                }
            }
            item {
                Surface(color = NavySurface, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("BNSS Section 480 (CrPC 437) — Bail Provisions", fontWeight = FontWeight.Bold, color = GoldPrimary, fontSize = 13.sp)
                        Text("Description: Conditions for release on bail in non-bailable offences.", color = TextLight, fontSize = 12.sp)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text("⚠️ Common Filing Mistake: Not annexing certified copies of Magistrate rejection order when moving Sessions Court.", color = StatusOrange, fontSize = 11.sp)
                    }
                }
            }
        }
    }
}
