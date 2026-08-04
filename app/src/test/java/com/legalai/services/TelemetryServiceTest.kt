package com.legalai.services

import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import java.io.File

class TelemetryServiceTest {

    @Before
    fun setUp() {
        TelemetryService.resetTelemetry()
    }

    @Test
    fun testRecordModelLoad() {
        TelemetryService.recordModelLoad(4500)
        assertEquals(4500L, TelemetryService.modelLoadTime)
    }

    @Test
    fun testRecordInference() {
        TelemetryService.recordInference(50, 2000)
        assertEquals(2000L, TelemetryService.lastInferenceTime)
        assertEquals(25.0, TelemetryService.lastInferenceSpeed, 0.01)
        assertEquals(50L, TelemetryService.totalTokensGenerated)
    }

    @Test
    fun testGetTelemetryData() {
        TelemetryService.recordModelLoad(4500)
        TelemetryService.recordInference(50, 2000)
        
        val tempDir = File(System.getProperty("java.io.tmpdir"))
        val data = TelemetryService.getTelemetryData("qwen-2.5-3b", tempDir)
        
        assertEquals(4500L, data.modelLoadTime)
        assertEquals(25.0, data.lastInferenceSpeed, 0.01)
        assertTrue(data.ramUsageMB > 1850)
    }
}
