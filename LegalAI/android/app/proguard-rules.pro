# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# llama.rn — Keep JNI bridge classes for on-device LLM inference
# Without this rule, Proguard strips the native bindings and causes
# UnsatisfiedLinkError at runtime when loading the GGUF model.
-keep class com.rnllama.** { *; }
