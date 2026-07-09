package com.voicesecretary.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews

class RecordWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetIds: IntArray,
  ) {
    for (appWidgetId in appWidgetIds) {
      val views = RemoteViews(context.packageName, R.layout.widget_record)
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse("teamday://record")).apply {
        setPackage(context.packageName)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
      val pending = PendingIntent.getActivity(
        context,
        0,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      views.setOnClickPendingIntent(R.id.widget_record_button, pending)
      appWidgetManager.updateAppWidget(appWidgetId, views)
    }
  }
}
