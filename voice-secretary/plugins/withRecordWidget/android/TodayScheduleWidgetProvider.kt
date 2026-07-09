package com.voicesecretary.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import java.util.Calendar
import java.util.Locale

class TodayScheduleWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    val todayKey = todayDateKey()
    val todayLabel = todayLabelText()
    val todaySchedules = WidgetDataStore.schedulesByDate(context)[todayKey].orEmpty()

    for (appWidgetId in appWidgetIds) {
      val views = RemoteViews(context.packageName, R.layout.widget_today_schedule)

      views.setTextViewText(R.id.widget_today_title, "오늘 · $todayLabel")
      views.setTextViewText(R.id.widget_today_count, "${todaySchedules.size}건")

      val slotTimes = intArrayOf(
        R.id.widget_schedule_1_time,
        R.id.widget_schedule_2_time,
        R.id.widget_schedule_3_time,
        R.id.widget_schedule_4_time,
      )
      val slotTitles = intArrayOf(
        R.id.widget_schedule_1_title,
        R.id.widget_schedule_2_title,
        R.id.widget_schedule_3_title,
        R.id.widget_schedule_4_title,
      )
      val slotRows = intArrayOf(
        R.id.widget_schedule_row_1,
        R.id.widget_schedule_row_2,
        R.id.widget_schedule_row_3,
        R.id.widget_schedule_row_4,
      )

      for (index in slotRows.indices) {
        val schedule = todaySchedules.getOrNull(index)
        if (schedule == null) {
          views.setViewVisibility(slotRows[index], View.GONE)
          continue
        }

        views.setViewVisibility(slotRows[index], View.VISIBLE)
        views.setTextViewText(slotTimes[index], schedule.time.ifBlank { "종일" })
        views.setTextViewText(slotTitles[index], schedule.title)
        if (schedule.status == "completed") {
          views.setTextColor(slotTitles[index], Color.parseColor("#94A3B8"))
        } else {
          views.setTextColor(slotTitles[index], Color.parseColor("#F8FAFC"))
        }
      }

      val extraCount = todaySchedules.size - slotRows.size
      if (extraCount > 0) {
        views.setViewVisibility(R.id.widget_schedule_more, View.VISIBLE)
        views.setTextViewText(R.id.widget_schedule_more, "외 ${extraCount}건 더 있음")
      } else {
        views.setViewVisibility(R.id.widget_schedule_more, View.GONE)
      }

      if (todaySchedules.isEmpty()) {
        views.setViewVisibility(R.id.widget_today_empty, View.VISIBLE)
      } else {
        views.setViewVisibility(R.id.widget_today_empty, View.GONE)
      }

      val openIntent = Intent(Intent.ACTION_VIEW, Uri.parse("teamday://home")).apply {
        setPackage(context.packageName)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
      val pending = PendingIntent.getActivity(
        context,
        appWidgetId,
        openIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      views.setOnClickPendingIntent(R.id.widget_today_root, pending)

      appWidgetManager.updateAppWidget(appWidgetId, views)
    }
  }

  companion object {
    private fun todayDateKey(): String {
      val calendar = Calendar.getInstance()
      return String.format(
        Locale.US,
        "%04d-%02d-%02d",
        calendar.get(Calendar.YEAR),
        calendar.get(Calendar.MONTH) + 1,
        calendar.get(Calendar.DAY_OF_MONTH),
      )
    }

    private fun todayLabelText(): String {
      val calendar = Calendar.getInstance()
      val month = calendar.get(Calendar.MONTH) + 1
      val day = calendar.get(Calendar.DAY_OF_MONTH)
      val weekday = arrayOf("일", "월", "화", "수", "목", "금", "토")[calendar.get(Calendar.DAY_OF_WEEK) - 1]
      return "${month}월 ${day}일 ($weekday)"
    }
  }
}
