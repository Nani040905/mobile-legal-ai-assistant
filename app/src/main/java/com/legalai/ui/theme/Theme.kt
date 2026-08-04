package com.legalai.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = Primary,
    background = Background,
    surface = Surface,
    onPrimary = Background,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceVariant,
    outline = Border
)

@Composable
fun LegalAITheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}
