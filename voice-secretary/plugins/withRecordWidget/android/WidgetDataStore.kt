package com.voicesecretary.app

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class WidgetScheduleItem(
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
        items.add(
          WidgetScheduleItem(
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
        list.sortedWith(compareBy({ it.time }, { it.title }))
      }
  }
}
