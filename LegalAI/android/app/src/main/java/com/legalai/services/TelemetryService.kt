package com.legalai.services

import java.io.File

object TelemetryService {
    var modelLoadTime: Long = 0
    var lastInferenceSpeed: Double = 0.0 // tokens/sec
    var lastInferenceTime: Long = 0 // ms
    var totalTokensGenerated: Long = 0

    fun recordModelLoad(durationMs: Long) {
        modelLoadTime = durationMs
    }

    fun recordInference(tokenCount: Long, durationMs: Long) {
        if (durationMs > 0) {
            lastInferenceSpeed = (tokenCount.toDouble() / durationMs.toDouble()) * 1000.0
            lastInferenceTime = durationMs
            totalTokensGenerated += tokenCount
        }
    }

    fun getTelemetryData(activeModelId: String, storageDir: File): TelemetryData {
        val runtime = Runtime.getRuntime()
        val usedMemory = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024)
        
        // Estimate RAM footprint of active model
        var estimatedRam = usedMemory + 180 // Base app RAM
        if (activeModelId == "qwen-2.5-3b") {
            estimatedRam += 1850
        } else if (activeModelId == "qwen-2.5-1.5b") {
            estimatedRam += 1100
        } else if (activeModelId.isNotEmpty()) {
            estimatedRam += 800
        }

        // Calculate storage size of directory files
        val totalBytes = getDirSize(storageDir)
        val storageSizeMB = totalBytes.toDouble() / (1024.0 * 1024.0)

        return TelemetryData(
            modelLoadTime = modelLoadTime,
            lastInferenceSpeed = Math.round(lastInferenceSpeed * 100.0) / 100.0,
            lastInferenceTime = lastInferenceTime,
            totalTokensGenerated = totalTokensGenerated,
            ramUsageMB = estimatedRam,
            storageSizeMB = Math.round(storageSizeMB * 100.0) / 100.0
        )
    }

    fun resetTelemetry() {
        modelLoadTime = 0
        lastInferenceSpeed = 0.0
        lastInferenceTime = 0
        totalTokensGenerated = 0
    }

    private fun getDirSize(dir: File): Long {
        if (!dir.exists()) return 0L
        if (dir.isFile) return dir.length()
        var size = 0L
        dir.listFiles()?.forEach { file ->
            size += if (file.isDirectory) getDirSize(file) else file.length()
        }
        return size
    }
}

data class TelemetryData(
    val modelLoadTime: Long,
    val lastInferenceSpeed: Double,
    val lastInferenceTime: Long,
    val totalTokensGenerated: Long,
    val ramUsageMB: Long,
    val storageSizeMB: Double
)
