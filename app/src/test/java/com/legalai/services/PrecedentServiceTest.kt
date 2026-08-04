package com.legalai.services

import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test

class PrecedentServiceTest {

    @Test
    fun testSearchPrecedents() = runBlocking {
        val results = PrecedentService.searchPrecedents("privacy")
        assertEquals(2, results.size)
        assertEquals("K.S. Puttaswamy v. Union of India", results[0].title)
    }

    @Test
    fun testGetPrecedentDetails() = runBlocking {
        val details = PrecedentService.getPrecedentDetails("prec_01")
        assertNotNull(details)
        assertEquals("2017 (10) SCC 1", details?.citation)
    }

    @Test
    fun testCitePrecedentInBrief() = runBlocking {
        val success = PrecedentService.citePrecedentInBrief("prec_01", "brief_99")
        assertTrue(success)
    }
}
