package com.voicesecretary.app

import android.content.Context
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object WidgetScheduleSync {
  fun syncScheduleStatus(context: Context, scheduleId: String, status: String) {
    Thread {
      val synced = tryPatchScheduleStatus(context, scheduleId, status)
      if (!synced) {
        WidgetDataStore.enqueuePendingToggle(context, scheduleId, status)
      } else {
        WidgetDataStore.removePendingToggle(context, scheduleId)
      }
    }.start()
  }

  fun flushPending(context: Context) {
    val pending = WidgetDataStore.loadPendingToggles(context)
    if (pending.isEmpty()) return

    Thread {
      for ((scheduleId, status) in pending) {
        val synced = tryPatchScheduleStatus(context, scheduleId, status)
        if (synced) {
          WidgetDataStore.removePendingToggle(context, scheduleId)
        }
      }
    }.start()
  }

  private fun tryPatchScheduleStatus(
    context: Context,
    scheduleId: String,
    status: String,
  ): Boolean {
    val token = WidgetDataStore.getAccessToken(context)
    val supabaseUrl = WidgetDataStore.getSupabaseUrl(context)
    val anonKey = WidgetDataStore.getAnonKey(context)
    if (token.isBlank() || supabaseUrl.isBlank() || anonKey.isBlank()) return false

    return try {
      val endpoint = URL("$supabaseUrl/rest/v1/schedules?id=eq.$scheduleId")
      val connection = (endpoint.openConnection() as HttpURLConnection).apply {
        requestMethod = "PATCH"
        connectTimeout = 8000
        readTimeout = 8000
        doOutput = true
        setRequestProperty("apikey", anonKey)
        setRequestProperty("Authorization", "Bearer $token")
        setRequestProperty("Content-Type", "application/json")
        setRequestProperty("Prefer", "return=minimal")
      }

      OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
        writer.write(JSONObject().put("status", status).toString())
      }

      val code = connection.responseCode
      connection.disconnect()
      code in 200..299
    } catch (_: Exception) {
      false
    }
  }
}
