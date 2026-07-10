package com.voicesecretary.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Paint
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import java.util.Locale

class TodayScheduleWidgetProvider : AppWidgetProvider() {
  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: android.os.Bundle,
  ) {
    onUpdate(context, appWidgetManager, intArrayOf(appWidgetId))
  }

  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    val hideCompleted = WidgetDataStore.isHideCompleted(context)
    val ordered = WidgetDataStore.allSchedulesOrdered(context)

    for (appWidgetId in appWidgetIds) {
      val maxVisibleRows = maxRowsForWidget(appWidgetManager, appWidgetId)
      val displayRows = buildDisplayRows(ordered, maxRows = maxVisibleRows)
      val totalCount = ordered.size
      val hiddenCount = totalCount - displayRows.size
      val views = RemoteViews(context.packageName, R.layout.widget_today_schedule)

      views.setTextViewText(R.id.widget_today_title, "전체 일정")
      views.setTextViewText(R.id.widget_today_count, "${totalCount}건")
      views.setTextViewText(
        R.id.widget_hide_completed_btn,
        if (hideCompleted) "완료 표시" else "완료 숨김",
      )

      val hideIntent = Intent(context, WidgetHideCompletedReceiver::class.java).apply {
        action = WidgetHideCompletedReceiver.ACTION_TOGGLE_HIDE
      }
      val hidePending = PendingIntent.getBroadcast(
        context,
        appWidgetId + 9000,
        hideIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      views.setOnClickPendingIntent(R.id.widget_hide_completed_btn, hidePending)

      for (slot in 0 until MAX_ROWS) {
        val rowNumber = slot + 1
        val rowId = viewId(context, "widget_schedule_row_$rowNumber")
        val checkId = viewId(context, "widget_schedule_${rowNumber}_check")
        val dayId = viewId(context, "widget_schedule_${rowNumber}_day")
        val timeId = viewId(context, "widget_schedule_${rowNumber}_time")
        val titleId = viewId(context, "widget_schedule_${rowNumber}_title")
        if (rowId == 0) continue

        val row = displayRows.getOrNull(slot)
        if (row == null) {
          views.setViewVisibility(rowId, View.GONE)
          continue
        }

        val completed = row.schedule.status == "completed"
        val incompletePastDue = row.isIncompletePast
        views.setViewVisibility(rowId, View.VISIBLE)
        views.setTextViewText(dayId, row.dayLabel)
        views.setTextViewText(timeId, row.schedule.time.ifBlank { "종일" })
        views.setTextViewText(titleId, row.schedule.title)

        views.setImageViewResource(
          checkId,
          if (completed) R.drawable.widget_checkbox_checked else R.drawable.widget_checkbox_unchecked,
        )

        if (completed) {
          views.setInt(titleId, "setPaintFlags", Paint.STRIKE_THRU_TEXT_FLAG or Paint.ANTI_ALIAS_FLAG)
          views.setTextColor(titleId, Color.parseColor("#64748B"))
          views.setTextColor(timeId, Color.parseColor("#64748B"))
          views.setTextColor(dayId, Color.parseColor("#64748B"))
        } else {
          views.setInt(titleId, "setPaintFlags", Paint.ANTI_ALIAS_FLAG)
          views.setTextColor(titleId, Color.parseColor("#F8FAFC"))
          views.setTextColor(timeId, Color.parseColor("#93C5FD"))
          views.setTextColor(
            dayId,
            if (incompletePastDue) Color.parseColor("#FCA5A5") else Color.parseColor("#64748B"),
          )
        }

        val toggleIntent = Intent(context, WidgetScheduleToggleReceiver::class.java).apply {
          action = WidgetScheduleToggleReceiver.ACTION_TOGGLE
          putExtra(WidgetScheduleToggleReceiver.EXTRA_SCHEDULE_ID, row.schedule.id)
        }
        val requestCode = row.schedule.id.hashCode()
        val togglePending = PendingIntent.getBroadcast(
          context,
          requestCode,
          toggleIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        views.setOnClickPendingIntent(checkId, togglePending)
        views.setOnClickPendingIntent(rowId, togglePending)
      }

      if (hiddenCount > 0) {
        views.setViewVisibility(R.id.widget_schedule_more, View.VISIBLE)
        views.setTextViewText(R.id.widget_schedule_more, "외 ${hiddenCount}건 더 있음 · 앱에서 보기")
      } else {
        views.setViewVisibility(R.id.widget_schedule_more, View.GONE)
      }

      if (totalCount == 0) {
        views.setViewVisibility(R.id.widget_today_empty, View.VISIBLE)
        views.setTextViewText(
          R.id.widget_today_empty,
          if (hideCompleted) "표시할 일정이 없습니다" else "등록된 일정이 없습니다",
        )
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
      views.setOnClickPendingIntent(R.id.widget_today_title, pending)
      views.setOnClickPendingIntent(R.id.widget_today_count, pending)

      appWidgetManager.updateAppWidget(appWidgetId, views)
    }
  }

  private data class DisplayRow(
    val dayLabel: String,
    val schedule: WidgetScheduleItem,
    val isIncompletePast: Boolean = false,
  )

  private fun buildDisplayRows(
    ordered: List<WidgetScheduleItem>,
    maxRows: Int,
  ): List<DisplayRow> {
    val today = todayDateKey()
    val rows = mutableListOf<DisplayRow>()
    var lastDateKey = ""

    ordered.forEach { schedule ->
      if (rows.size >= maxRows) return rows
      val incompletePastDue =
        (schedule.status == "pending" || schedule.status == "snoozed") && schedule.dateKey < today
      val showDayLabel = schedule.dateKey != lastDateKey
      lastDateKey = schedule.dateKey
      rows.add(
        DisplayRow(
          dayLabel = when {
            !showDayLabel -> ""
            incompletePastDue && rows.none { it.isIncompletePast } -> "미완료"
            else -> formatShortDate(schedule.dateKey)
          },
          schedule = schedule,
          isIncompletePast = incompletePastDue,
        ),
      )
    }

    return rows
  }

  private fun formatShortDate(dateKey: String): String {
    val parts = dateKey.split("-")
    if (parts.size != 3) return dateKey
    val month = parts[1].toIntOrNull() ?: return dateKey
    val day = parts[2].toIntOrNull() ?: return dateKey
    return "${month}/${day}"
  }

  private fun todayDateKey(): String {
    val calendar = java.util.Calendar.getInstance()
    return String.format(
      Locale.US,
      "%04d-%02d-%02d",
      calendar.get(java.util.Calendar.YEAR),
      calendar.get(java.util.Calendar.MONTH) + 1,
      calendar.get(java.util.Calendar.DAY_OF_MONTH),
    )
  }

  private fun maxRowsForWidget(appWidgetManager: AppWidgetManager, appWidgetId: Int): Int {
    val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
    val heightDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 220)
    val estimatedRows = ((heightDp - 56) / 21).coerceAtLeast(4)
    return estimatedRows.coerceAtMost(MAX_ROWS)
  }

  companion object {
    private const val MAX_ROWS = 20

    private fun viewId(context: Context, name: String): Int =
      context.resources.getIdentifier(name, "id", context.packageName)
  }
}
