package com.legalai.services

import org.junit.Assert.*
import org.junit.Test

class CorpusManagerTest {

    @Test
    fun testSearchCorpusMetadata() {
        val results = CorpusManager.searchCorpusMetadata("penal")
        assertEquals(1, results.size)
        assertEquals("ipc_1860", results[0].id)
    }

    @Test
    fun testGetActMetadata() {
        val act = CorpusManager.getActMetadata("bns_2023")
        assertNotNull(act)
        assertEquals("Bharatiya Nyaya Sanhita", act?.name)
    }
}
