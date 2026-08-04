package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.*

@Composable
fun BiometricLockScreen(
    statusMessage: String,
    onAuthenticateBiometric: () -> Unit,
    onUnlockWithPin: (pin: String) -> Boolean
) {
    var pinText by remember { mutableStateOf("") }
    var pinError by remember { mutableStateOf<String?>(null) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(NavyBackground)
            .padding(24.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(GoldPrimary.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Security,
                    contentDescription = "Lock",
                    tint = GoldPrimary,
                    modifier = Modifier.size(44.dp)
                )
            }

            Spacer(modifier = Modifier.height(20.dp))
            Text(
                text = "Legal AI Protection",
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = TextLight
            )
            Text(
                text = "Confidential Legal Files Secured",
                fontSize = 13.sp,
                color = TextMuted,
                modifier = Modifier.padding(top = 4.dp)
            )

            Spacer(modifier = Modifier.height(32.dp))

            Button(
                onClick = onAuthenticateBiometric,
                colors = ButtonDefaults.buttonColors(containerColor = GoldPrimary),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
                    .testTag("biometric_unlock_button")
            ) {
                Icon(Icons.Default.Fingerprint, contentDescription = null, tint = NavyBackground)
                Spacer(modifier = Modifier.width(10.dp))
                Text("Unlock with Fingerprint / Face", color = NavyBackground, fontWeight = FontWeight.Bold)
            }

            Spacer(modifier = Modifier.height(24.dp))
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                HorizontalDivider(modifier = Modifier.weight(1f), color = NavySurfaceHigh)
                Text("  OR USE PIN  ", color = TextMuted, fontSize = 11.sp)
                HorizontalDivider(modifier = Modifier.weight(1f), color = NavySurfaceHigh)
            }

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = pinText,
                onValueChange = {
                    pinText = it
                    pinError = null
                },
                placeholder = { Text("Enter Passcode (e.g. 1234)", color = TextMuted) },
                visualTransformation = PasswordVisualTransformation(),
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("passcode_pin_input"),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = GoldPrimary,
                    focusedTextColor = TextLight,
                    unfocusedTextColor = TextLight,
                    focusedContainerColor = NavySurface,
                    unfocusedContainerColor = NavySurface
                ),
                shape = RoundedCornerShape(12.dp)
            )

            if (pinError != null) {
                Text(
                    text = pinError!!,
                    color = StatusRed,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Button(
                onClick = {
                    if (!onUnlockWithPin(pinText)) {
                        pinError = "Incorrect Passcode. Try 1234."
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = NavySurfaceHigh),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Unlock with Passcode", color = TextLight)
            }
        }
    }
}
