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

                /* Open an input stream using the content resolver to support all types of URIs */
                val inputStream: InputStream? = reactApplicationContext.contentResolver.openInputStream(uri)
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
}
