package com.legalai

import android.net.Uri
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.tom_roush.pdfbox.android.PDFBoxResourceLoader
import com.tom_roush.pdfbox.pdmodel.PDDocument
import com.tom_roush.pdfbox.text.PDFTextStripper
import java.io.InputStream

/**
 * PdfExtractorModule — Android Native Module for offline PDF text extraction.
 *
 * PURPOSE: Bridges React Native JavaScript code to native Java/Kotlin PDFBox APIs.
 * This allows extracting raw text from PDFs directly on the device, fully offline.
 *
 * DESIGN DECISIONS:
 * - Threaded Execution: PDF extraction is CPU and I/O bound. Running it on a background
 *   thread prevents UI freezing (ANR) and blocks neither the main nor the JS thread.
 *   React Native requires bridge method tasks that block to be delegated to background pools.
 * - ContentResolver: Opens input streams from generic Android URIs (e.g. content:// or file://)
 *   which is essential since React Native Document Picker outputs content provider URIs.
 * - Lazy Loading: PDFBoxResourceLoader.init() is called on demand to set up resources
 *   without adding launch-time overhead.
 */
class PdfExtractorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    /* Returns the name used to reference this module in JavaScript: NativeModules.PdfExtractor */
    override fun getName(): String = "PdfExtractor"

    /**
     * extractText — Extracts raw text content from a PDF document.
     *
     * @param fileUri — The Android URI string (content:// or file://) pointing to the PDF.
     * @param promise — React Native promise resolved with the text or rejected with an error.
     */
    @ReactMethod
    fun extractText(fileUri: String, promise: Promise) {
        /* Run on a separate thread to prevent blocking React Native's JS thread or the UI thread */
        Thread {
            try {
                /* Initialize the PDFBox resource loader with our application context (required on Android) */
                PDFBoxResourceLoader.init(reactApplicationContext)

                /* Parse the file URI string into an Android Uri object */
                val uri = Uri.parse(fileUri)

                /* Open an input stream using contentResolver for content:// URIs, or direct FileInputStream for local files */
                val inputStream: InputStream? = if (fileUri.startsWith("content://")) {
                    reactApplicationContext.contentResolver.openInputStream(uri)
                } else {
                    // Extract path: remove "file://" prefix if present
                    val path = if (fileUri.startsWith("file://")) fileUri.substring(7) else fileUri
                    // Decode URL-encoded characters (like %20) just in case
                    val decodedPath = java.net.URLDecoder.decode(path, "UTF-8")
                    java.io.FileInputStream(decodedPath)
                }

                if (inputStream == null) {
                    promise.reject("FILE_NOT_FOUND", "Could not open input stream for URI: $fileUri")
                    return@Thread
                }

                /* Load the PDF document using Apache PDFBox */
                val document = PDDocument.load(inputStream)

                /* Instantiate PDFTextStripper to read text from the loaded document */
                val stripper = PDFTextStripper()
                val extractedText = stripper.getText(document)

                /* Close the document and clean up file resources */
                document.close()
                inputStream.close()

                /* Resolve the promise with the final extracted text content */
                promise.resolve(extractedText)
            } catch (e: Exception) {
                /* Reject the promise if any read/extraction error occurs, passing along the exception details */
                promise.reject("EXTRACTION_ERROR", "Failed to extract text from PDF: ${e.message}", e)
            }
        }.start()
    }

    /**
     * extractDocxText — Extracts raw text content from a DOCX (zipped XML) document.
     */
    @ReactMethod
    fun extractDocxText(fileUri: String, promise: Promise) {
        Thread {
            try {
                val uri = Uri.parse(fileUri)
                val inputStream: InputStream? = if (fileUri.startsWith("content://")) {
                    reactApplicationContext.contentResolver.openInputStream(uri)
                } else {
                    val path = if (fileUri.startsWith("file://")) fileUri.substring(7) else fileUri
                    val decodedPath = java.net.URLDecoder.decode(path, "UTF-8")
                    java.io.FileInputStream(decodedPath)
                }

                if (inputStream == null) {
                    promise.reject("FILE_NOT_FOUND", "Could not open input stream for URI: $fileUri")
                    return@Thread
                }

                var extractedText = ""
                java.util.zip.ZipInputStream(inputStream).use { zipInputStream ->
                    var entry = zipInputStream.nextEntry
                    while (entry != null) {
                        if (entry.name == "word/document.xml") {
                            extractedText = parseDocxXml(zipInputStream)
                            break
                        }
                        entry = zipInputStream.nextEntry
                    }
                }

                promise.resolve(extractedText)
            } catch (e: Exception) {
                promise.reject("EXTRACTION_ERROR", "Failed to extract text from DOCX: ${e.message}", e)
            }
        }.start()
    }

    private fun parseDocxXml(inputStream: InputStream): String {
        val builder = StringBuilder()
        try {
            val parser = android.util.Xml.newPullParser()
            parser.setFeature(org.xmlpull.v1.XmlPullParser.FEATURE_PROCESS_NAMESPACES, false)
            parser.setInput(inputStream, "UTF-8")
            var eventType = parser.eventType
            while (eventType != org.xmlpull.v1.XmlPullParser.END_DOCUMENT) {
                val name = parser.name
                if (eventType == org.xmlpull.v1.XmlPullParser.START_TAG) {
                    if (name == "w:t") {
                        builder.append(parser.nextText())
                    } else if (name == "w:tab") {
                        builder.append("\t")
                    } else if (name == "w:br" || name == "w:cr") {
                        builder.append("\n")
                    }
                } else if (eventType == org.xmlpull.v1.XmlPullParser.END_TAG) {
                    if (name == "w:p") {
                        builder.append("\n")
                    }
                }
                eventType = parser.next()
            }
        } catch (e: Exception) {
            // Return whatever was parsed so far if there's any format error
        }
        return builder.toString()
    }

    /**
     * extractTxtText — Extracts text content from a plain text (.txt) document.
     */
    @ReactMethod
    fun extractTxtText(fileUri: String, promise: Promise) {
        Thread {
            try {
                val uri = Uri.parse(fileUri)
                val inputStream: InputStream? = if (fileUri.startsWith("content://")) {
                    reactApplicationContext.contentResolver.openInputStream(uri)
                } else {
                    val path = if (fileUri.startsWith("file://")) fileUri.substring(7) else fileUri
                    val decodedPath = java.net.URLDecoder.decode(path, "UTF-8")
                    java.io.FileInputStream(decodedPath)
                }

                if (inputStream == null) {
                    promise.reject("FILE_NOT_FOUND", "Could not open input stream for URI: $fileUri")
                    return@Thread
                }

                val text = inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
                promise.resolve(text)
            } catch (e: Exception) {
                promise.reject("EXTRACTION_ERROR", "Failed to extract text from TXT: ${e.message}", e)
            }
        }.start()
    }

    /**
     * getSystemMemoryInfo — Returns current JVM and Native Heap memory utilization.
     */
    @ReactMethod
    fun getSystemMemoryInfo(promise: Promise) {
        try {
            val runtime = Runtime.getRuntime()
            val totalMemory = runtime.totalMemory()
            val freeMemory = runtime.freeMemory()
            val maxMemory = runtime.maxMemory()
            
            val nativeAllocated = android.os.Debug.getNativeHeapAllocatedSize()
            val nativeFree = android.os.Debug.getNativeHeapFreeSize()
            val nativeSize = android.os.Debug.getNativeHeapSize()

            val map = com.facebook.react.bridge.Arguments.createMap()
            map.putDouble("javaTotal", totalMemory.toDouble())
            map.putDouble("javaFree", freeMemory.toDouble())
            map.putDouble("javaMax", maxMemory.toDouble())
            map.putDouble("nativeAllocated", nativeAllocated.toDouble())
            map.putDouble("nativeFree", nativeFree.toDouble())
            map.putDouble("nativeSize", nativeSize.toDouble())

            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("MEMORY_ERROR", "Failed to get memory info: ${e.message}", e)
        }
    }
}
