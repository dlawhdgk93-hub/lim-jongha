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
