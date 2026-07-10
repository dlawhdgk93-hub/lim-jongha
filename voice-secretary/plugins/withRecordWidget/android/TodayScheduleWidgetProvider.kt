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
import java.util.Calendar
import java.util.Locale

class TodayScheduleWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    val schedulesByDate = WidgetDataStore.schedulesByDate(context)
    val incompletePast = WidgetDataStore.incompletePastSchedules(context)
    val dayBuckets = buildDayBuckets(schedulesByDate)
    val displayRows = buildDisplayRows(incompletePast, dayBuckets, maxRows = MAX_ROWS)
    val totalCount = incompletePast.size + dayBuckets.sumOf { it.schedules.size }
    val hiddenCount = totalCount - displayRows.size

    for (appWidgetId in appWidgetIds) {
      val views = RemoteViews(context.packageName, R.layout.widget_today_schedule)

      views.setTextViewText(R.id.widget_today_title, "미완료·3일 일정")
      views.setTextViewText(R.id.widget_today_count, "${totalCount}건")

      for (index in ROW_IDS.indices) {
        val row = displayRows.getOrNull(index)
        if (row == null) {
          views.setViewVisibility(ROW_IDS[index], View.GONE)
          continue
        }

        val completed = row.schedule.status == "completed"
        val incompletePastDue = row.isIncompletePast
        views.setViewVisibility(ROW_IDS[index], View.VISIBLE)
        views.setTextViewText(DAY_IDS[index], row.dayLabel)
        views.setTextViewText(TIME_IDS[index], row.schedule.time.ifBlank { "종일" })
        views.setTextViewText(TITLE_IDS[index], row.schedule.title)

        views.setImageViewResource(
          CHECK_IDS[index],
          if (completed) R.drawable.widget_checkbox_checked else R.drawable.widget_checkbox_unchecked,
        )

        if (completed) {
          views.setInt(TITLE_IDS[index], "setPaintFlags", Paint.STRIKE_THRU_TEXT_FLAG or Paint.ANTI_ALIAS_FLAG)
          views.setTextColor(TITLE_IDS[index], Color.parseColor("#64748B"))
          views.setTextColor(TIME_IDS[index], Color.parseColor("#64748B"))
          views.setTextColor(DAY_IDS[index], Color.parseColor("#64748B"))
        } else {
          views.setInt(TITLE_IDS[index], "setPaintFlags", Paint.ANTI_ALIAS_FLAG)
          views.setTextColor(TITLE_IDS[index], Color.parseColor("#F8FAFC"))
          views.setTextColor(TIME_IDS[index], Color.parseColor("#93C5FD"))
          views.setTextColor(
            DAY_IDS[index],
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
        views.setOnClickPendingIntent(CHECK_IDS[index], togglePending)
        views.setOnClickPendingIntent(ROW_IDS[index], togglePending)
      }

      if (hiddenCount > 0) {
        views.setViewVisibility(R.id.widget_schedule_more, View.VISIBLE)
        views.setTextViewText(R.id.widget_schedule_more, "외 ${hiddenCount}건 더 있음 · 앱에서 보기")
      } else {
        views.setViewVisibility(R.id.widget_schedule_more, View.GONE)
      }

      if (totalCount == 0) {
        views.setViewVisibility(R.id.widget_today_empty, View.VISIBLE)
        views.setTextViewText(R.id.widget_today_empty, "미완료·3일간 일정이 없습니다")
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

  private data class DayBucket(
    val label: String,
    val dateKey: String,
    val schedules: List<WidgetScheduleItem>,
  )

  private data class DisplayRow(
    val dayLabel: String,
    val schedule: WidgetScheduleItem,
    val isIncompletePast: Boolean = false,
  )

  private fun buildDayBuckets(schedulesByDate: Map<String, List<WidgetScheduleItem>>): List<DayBucket> {
    val calendar = Calendar.getInstance()
    val labels = arrayOf("오늘", "내일", "글피")
    val buckets = mutableListOf<DayBucket>()

    for (offset in 0..2) {
      val key = dateKeyForOffset(calendar, offset)
      buckets.add(
        DayBucket(
          label = labels[offset],
          dateKey = key,
          schedules = schedulesByDate[key].orEmpty(),
        ),
      )
    }

    return buckets
  }

  private fun buildDisplayRows(
    incompletePast: List<WidgetScheduleItem>,
    buckets: List<DayBucket>,
    maxRows: Int,
  ): List<DisplayRow> {
    val rows = mutableListOf<DisplayRow>()

    incompletePast.forEachIndexed { index, schedule ->
      if (rows.size >= maxRows) return rows
      rows.add(
        DisplayRow(
          dayLabel = if (index == 0) "미완료" else formatShortDate(schedule.dateKey),
          schedule = schedule,
          isIncompletePast = true,
        ),
      )
    }

    for (bucket in buckets) {
      bucket.schedules.forEachIndexed { index, schedule ->
        if (rows.size >= maxRows) return rows
        rows.add(
          DisplayRow(
            dayLabel = if (index == 0) bucket.label else "",
            schedule = schedule,
            isIncompletePast = false,
          ),
        )
      }
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

  private fun dateKeyForOffset(base: Calendar, dayOffset: Int): String {
    val calendar = base.clone() as Calendar
    calendar.add(Calendar.DAY_OF_MONTH, dayOffset)
    return String.format(
      Locale.US,
      "%04d-%02d-%02d",
      calendar.get(Calendar.YEAR),
      calendar.get(Calendar.MONTH) + 1,
      calendar.get(Calendar.DAY_OF_MONTH),
    )
  }

  companion object {
    private const val MAX_ROWS = 8

    private val ROW_IDS = intArrayOf(
      R.id.widget_schedule_row_1,
      R.id.widget_schedule_row_2,
      R.id.widget_schedule_row_3,
      R.id.widget_schedule_row_4,
      R.id.widget_schedule_row_5,
      R.id.widget_schedule_row_6,
      R.id.widget_schedule_row_7,
      R.id.widget_schedule_row_8,
    )
    private val CHECK_IDS = intArrayOf(
      R.id.widget_schedule_1_check,
      R.id.widget_schedule_2_check,
      R.id.widget_schedule_3_check,
      R.id.widget_schedule_4_check,
      R.id.widget_schedule_5_check,
      R.id.widget_schedule_6_check,
      R.id.widget_schedule_7_check,
      R.id.widget_schedule_8_check,
    )
    private val DAY_IDS = intArrayOf(
      R.id.widget_schedule_1_day,
      R.id.widget_schedule_2_day,
      R.id.widget_schedule_3_day,
      R.id.widget_schedule_4_day,
      R.id.widget_schedule_5_day,
      R.id.widget_schedule_6_day,
      R.id.widget_schedule_7_day,
      R.id.widget_schedule_8_day,
    )
    private val TIME_IDS = intArrayOf(
      R.id.widget_schedule_1_time,
      R.id.widget_schedule_2_time,
      R.id.widget_schedule_3_time,
      R.id.widget_schedule_4_time,
      R.id.widget_schedule_5_time,
      R.id.widget_schedule_6_time,
      R.id.widget_schedule_7_time,
      R.id.widget_schedule_8_time,
    )
    private val TITLE_IDS = intArrayOf(
      R.id.widget_schedule_1_title,
      R.id.widget_schedule_2_title,
      R.id.widget_schedule_3_title,
      R.id.widget_schedule_4_title,
      R.id.widget_schedule_5_title,
      R.id.widget_schedule_6_title,
      R.id.widget_schedule_7_title,
      R.id.widget_schedule_8_title,
    )
  }
}
