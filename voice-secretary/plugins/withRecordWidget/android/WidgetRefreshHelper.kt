package com.voicesecretary.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent

object WidgetRefreshHelper {
  fun refreshAll(context: Context) {
    refreshProvider(context, TodayScheduleWidgetProvider::class.java)
    refreshProvider(context, CalendarWidgetProvider::class.java)
  }

  private fun refreshProvider(context: Context, providerClass: Class<*>) {
    val manager = AppWidgetManager.getInstance(context)
    val component = ComponentName(context, providerClass)
    val ids = manager.getAppWidgetIds(component)
    if (ids.isEmpty()) return

    val intent = Intent(context, providerClass).apply {
      action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
      putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
    }
    context.sendBroadcast(intent)
  }
}
