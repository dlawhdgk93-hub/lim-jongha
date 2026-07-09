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

class CalendarWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    val calendar = Calendar.getInstance()
    val year = calendar.get(Calendar.YEAR)
    val month = calendar.get(Calendar.MONTH)
    val todayKey = String.format(
      Locale.US,
      "%04d-%02d-%02d",
      year,
      month + 1,
      calendar.get(Calendar.DAY_OF_MONTH),
    )
    val schedulesByDate = WidgetDataStore.schedulesByDate(context)

    val monthLabel = String.format(Locale.KOREA, "%d년 %d월", year, month + 1)
    val firstDay = Calendar.getInstance().apply {
      set(Calendar.YEAR, year)
      set(Calendar.MONTH, month)
      set(Calendar.DAY_OF_MONTH, 1)
    }
    val daysInMonth = firstDay.getActualMaximum(Calendar.DAY_OF_MONTH)
    val startOffset = firstDay.get(Calendar.DAY_OF_WEEK) - 1

    for (appWidgetId in appWidgetIds) {
      val views = RemoteViews(context.packageName, R.layout.widget_calendar)
      views.setTextViewText(R.id.widget_calendar_title, monthLabel)

      for (cellIndex in 0 until 42) {
        val dayViewId = dayViewIds[cellIndex]
        val dayNumber = cellIndex - startOffset + 1

        if (dayNumber < 1 || dayNumber > daysInMonth) {
          views.setTextViewText(dayViewId, "")
          views.setTextColor(dayViewId, Color.parseColor("#334155"))
          views.setInt(dayViewId, "setBackgroundResource", R.drawable.widget_day_cell_empty)
          continue
        }

        val dateKey = String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, dayNumber)
        val count = schedulesByDate[dateKey]?.size ?: 0
        val label = if (count > 0) "$dayNumber·" else dayNumber.toString()

        views.setTextViewText(dayViewId, label)

        when {
          dateKey == todayKey -> {
            views.setTextColor(dayViewId, Color.parseColor("#FFFFFF"))
            views.setInt(dayViewId, "setBackgroundResource", R.drawable.widget_day_cell_today)
          }
          count > 0 -> {
            views.setTextColor(dayViewId, Color.parseColor("#93C5FD"))
            views.setInt(dayViewId, "setBackgroundResource", R.drawable.widget_day_cell_event)
          }
          else -> {
            views.setTextColor(dayViewId, Color.parseColor("#E2E8F0"))
            views.setInt(dayViewId, "setBackgroundResource", R.drawable.widget_day_cell_empty)
          }
        }
      }

      val openIntent = Intent(Intent.ACTION_VIEW, Uri.parse("teamday://home")).apply {
        setPackage(context.packageName)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
      val pending = PendingIntent.getActivity(
        context,
        appWidgetId + 1000,
        openIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      views.setOnClickPendingIntent(R.id.widget_calendar_root, pending)

      appWidgetManager.updateAppWidget(appWidgetId, views)
    }
  }

  companion object {
    private val dayViewIds = intArrayOf(
      R.id.widget_day_00, R.id.widget_day_01, R.id.widget_day_02, R.id.widget_day_03,
      R.id.widget_day_04, R.id.widget_day_05, R.id.widget_day_06,
      R.id.widget_day_07, R.id.widget_day_08, R.id.widget_day_09, R.id.widget_day_10,
      R.id.widget_day_11, R.id.widget_day_12, R.id.widget_day_13,
      R.id.widget_day_14, R.id.widget_day_15, R.id.widget_day_16, R.id.widget_day_17,
      R.id.widget_day_18, R.id.widget_day_19, R.id.widget_day_20,
      R.id.widget_day_21, R.id.widget_day_22, R.id.widget_day_23, R.id.widget_day_24,
      R.id.widget_day_25, R.id.widget_day_26, R.id.widget_day_27, R.id.widget_day_28,
      R.id.widget_day_29, R.id.widget_day_30, R.id.widget_day_31, R.id.widget_day_32,
      R.id.widget_day_33, R.id.widget_day_34, R.id.widget_day_35, R.id.widget_day_36,
      R.id.widget_day_37, R.id.widget_day_38, R.id.widget_day_39, R.id.widget_day_40,
      R.id.widget_day_41,
    )
  }
}
