package com.voicesecretary.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class WidgetScheduleItem(
  val id: String,
  val dateKey: String,
  val time: String,
  val title: String,
  val status: String,
)

object WidgetDataStore {
  private const val PREFS_NAME = "teamday_widget_data"
  private const val KEY_SCHEDULES_JSON = "schedules_json"
  private const val KEY_HIDE_COMPLETED = "hide_completed"
  private const val KEY_ACCESS_TOKEN = "access_token"
  private const val KEY_SUPABASE_URL = "supabase_url"
  private const val KEY_ANON_KEY = "anon_key"
  private const val KEY_PENDING_TOGGLES = "pending_toggles_json"

  fun save(context: Context, json: String) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_SCHEDULES_JSON, json)
      .apply()
  }

  fun loadSchedules(context: Context): List<WidgetScheduleItem> {
    val raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(KEY_SCHEDULES_JSON, null)
      ?: return emptyList()

    return try {
      val root = JSONObject(raw)
      val array = root.optJSONArray("schedules") ?: JSONArray()
      val items = mutableListOf<WidgetScheduleItem>()
      for (i in 0 until array.length()) {
        val item = array.optJSONObject(i) ?: continue
        val dateKey = item.optString("dateKey")
        if (dateKey.isBlank()) continue
        val id = item.optString("id")
        if (id.isBlank()) continue
        items.add(
          WidgetScheduleItem(
            id = id,
            dateKey = dateKey,
            time = item.optString("time", ""),
            title = item.optString("title", "일정"),
            status = item.optString("status", "pending"),
          ),
        )
      }
      items
    } catch (_: Exception) {
      emptyList()
    }
  }

  fun isHideCompleted(context: Context): Boolean {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getBoolean(KEY_HIDE_COMPLETED, false)
  }

  fun toggleHideCompleted(context: Context): Boolean {
    val next = !isHideCompleted(context)
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(KEY_HIDE_COMPLETED, next)
      .apply()
    return next
  }

  fun allSchedulesOrdered(context: Context): List<WidgetScheduleItem> {
    val today = todayDateKey()
    val hideCompleted = isHideCompleted(context)
    val all = loadSchedules(context)
      .filter { it.status != "cancelled" }
      .filter { !hideCompleted || it.status != "completed" }

    val incompletePast = all
      .filter { (it.status == "pending" || it.status == "snoozed") && it.dateKey < today }
      .sortedWith(compareBy({ it.dateKey }, { it.time }, { it.title }))

    val incompleteIds = incompletePast.map { it.id }.toSet()
    val rest = all
      .filter { it.id !in incompleteIds }
      .sortedWith(
        compareBy<WidgetScheduleItem>(
          { if (it.status == "completed") 1 else 0 },
          { it.dateKey },
          { it.time },
          { it.title },
        ),
      )

    return incompletePast + rest
  }

  fun schedulesByDate(context: Context): Map<String, List<WidgetScheduleItem>> {
    return loadSchedules(context)
      .filter { it.status != "cancelled" }
      .groupBy { it.dateKey }
      .mapValues { (_, list) ->
        list.sortedWith(
          compareBy<WidgetScheduleItem> { if (it.status == "completed") 1 else 0 }
            .thenBy { it.time }
            .thenBy { it.title },
        )
      }
  }

  fun incompletePastSchedules(context: Context): List<WidgetScheduleItem> {
    val today = todayDateKey()
    return loadSchedules(context)
      .filter { it.status == "pending" || it.status == "snoozed" }
      .filter { it.dateKey < today }
      .sortedWith(compareBy({ it.dateKey }, { it.time }, { it.title }))
  }

  private fun todayDateKey(): String {
    val calendar = java.util.Calendar.getInstance()
    return String.format(
      java.util.Locale.US,
      "%04d-%02d-%02d",
      calendar.get(java.util.Calendar.YEAR),
      calendar.get(java.util.Calendar.MONTH) + 1,
      calendar.get(java.util.Calendar.DAY_OF_MONTH),
    )
  }

  fun saveAuth(
    context: Context,
    accessToken: String,
    supabaseUrl: String,
    anonKey: String,
  ) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_ACCESS_TOKEN, accessToken)
      .putString(KEY_SUPABASE_URL, supabaseUrl)
      .putString(KEY_ANON_KEY, anonKey)
      .apply()
  }

  fun getAccessToken(context: Context): String {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(KEY_ACCESS_TOKEN, "")
      .orEmpty()
  }

  fun getSupabaseUrl(context: Context): String {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(KEY_SUPABASE_URL, "")
      .orEmpty()
  }

  fun getAnonKey(context: Context): String {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(KEY_ANON_KEY, "")
      .orEmpty()
  }

  fun enqueuePendingToggle(context: Context, scheduleId: String, status: String) {
    val pending = loadPendingToggles(context).toMutableMap()
    pending[scheduleId] = status
    savePendingToggles(context, pending)
  }

  fun removePendingToggle(context: Context, scheduleId: String) {
    val pending = loadPendingToggles(context).toMutableMap()
    if (pending.remove(scheduleId) != null) {
      savePendingToggles(context, pending)
    }
  }

  fun loadPendingToggles(context: Context): Map<String, String> {
    val raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(KEY_PENDING_TOGGLES, null)
      ?: return emptyMap()

    return try {
      val root = JSONObject(raw)
      val keys = root.keys()
      val map = mutableMapOf<String, String>()
      while (keys.hasNext()) {
        val key = keys.next()
        val value = root.optString(key)
        if (key.isNotBlank() && value.isNotBlank()) {
          map[key] = value
        }
      }
      map
    } catch (_: Exception) {
      emptyMap()
    }
  }

  private fun savePendingToggles(context: Context, pending: Map<String, String>) {
    val root = JSONObject()
    for ((id, status) in pending) {
      root.put(id, status)
    }
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_PENDING_TOGGLES, root.toString())
      .apply()
  }

  fun toggleScheduleStatus(context: Context, scheduleId: String): String? {
    val items = loadSchedules(context).toMutableList()
    val index = items.indexOfFirst { it.id == scheduleId }
    if (index < 0) return null

    val current = items[index]
    val nextStatus = if (current.status == "completed") "pending" else "completed"
    items[index] = current.copy(status = nextStatus)
    saveItems(context, items)
    return nextStatus
  }

  private fun saveItems(context: Context, items: List<WidgetScheduleItem>) {
    val array = JSONArray()
    for (item in items) {
      array.put(
        JSONObject()
          .put("id", item.id)
          .put("dateKey", item.dateKey)
          .put("time", item.time)
          .put("title", item.title)
          .put("status", item.status),
      )
    }
    save(context, JSONObject().put("schedules", array).toString())
  }
}
