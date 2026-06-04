package com.legalai

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import java.util.Collections

/**
 * PdfExtractorPackage — React Native package for registering the PdfExtractor native module.
 *
 * PURPOSE: Exposes PdfExtractorModule to React Native's bridge so it can be autolinked
 * or manually registered and accessed in JavaScript.
 */
class PdfExtractorPackage : ReactPackage {

    /* Returns the list of native modules registered by this package */
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(PdfExtractorModule(reactContext))
    }

    /* Returns the list of custom UI View Managers (none needed for this package) */
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return Collections.emptyList()
    }
}
