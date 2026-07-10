const {
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
  AndroidConfig,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PLUGIN_ANDROID = path.join(__dirname, 'android');

const WIDGET_RECEIVERS = [
  {
    name: '.RecordWidgetProvider',
    label: '팀데이 녹음',
    infoXml: '@xml/record_widget_info',
  },
  {
    name: '.TodayScheduleWidgetProvider',
    label: '팀데이 미완료·3일',
    infoXml: '@xml/today_widget_info',
  },
  {
    name: '.CalendarWidgetProvider',
    label: '팀데이 달력',
    infoXml: '@xml/calendar_widget_info',
  },
];

const KOTLIN_FILES = [
  'RecordWidgetProvider.kt',
  'TodayScheduleWidgetProvider.kt',
  'CalendarWidgetProvider.kt',
  'WidgetDataStore.kt',
  'WidgetRefreshHelper.kt',
  'WidgetSyncModule.kt',
  'WidgetSyncPackage.kt',
  'WidgetScheduleToggleReceiver.kt',
];

const LAYOUT_FILES = {
  'widget_record.xml': 'res/layout/widget_record.xml',
  'widget_today_schedule.xml': 'res/layout/widget_today_schedule.xml',
  'widget_calendar.xml': 'res/layout/widget_calendar.xml',
};

const XML_FILES = {
  'record_widget_info.xml': 'res/xml/record_widget_info.xml',
  'today_widget_info.xml': 'res/xml/today_widget_info.xml',
  'calendar_widget_info.xml': 'res/xml/calendar_widget_info.xml',
};

const DRAWABLE_FILES = {
  'widget_record_bg.xml': 'res/drawable/widget_record_bg.xml',
  'widget_panel_bg.xml': 'res/drawable/widget_panel_bg.xml',
  'widget_day_cell_empty.xml': 'res/drawable/widget_day_cell_empty.xml',
  'widget_day_cell_today.xml': 'res/drawable/widget_day_cell_today.xml',
  'widget_day_cell_event.xml': 'res/drawable/widget_day_cell_event.xml',
  'widget_checkbox_checked.xml': 'res/drawable/widget_checkbox_checked.xml',
  'widget_checkbox_unchecked.xml': 'res/drawable/widget_checkbox_unchecked.xml',
};

const TOGGLE_RECEIVER = {
  name: '.WidgetScheduleToggleReceiver',
  action: 'com.voicesecretary.app.WIDGET_TOGGLE_SCHEDULE',
};

const WIDGET_STRINGS = [
  ['widget_record_desc', '바로 음성 기록'],
  ['widget_today_desc', '미완료·오늘·내일·글피 일정'],
  ['widget_calendar_desc', '월간 달력'],
];

function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function ensureToggleReceiver(app, receiverName, action) {
  if (!Array.isArray(app.receiver)) {
    app.receiver = [];
  }

  const alreadyAdded = app.receiver.some((item) => item?.$?.['android:name'] === receiverName);
  if (alreadyAdded) return;

  app.receiver.push({
    $: {
      'android:name': receiverName,
      'android:exported': 'false',
    },
    'intent-filter': [
      {
        action: [{ $: { 'android:name': action } }],
      },
    ],
  });
}

function ensureWidgetReceiver(app, receiverName, label, infoXml) {
  if (!Array.isArray(app.receiver)) {
    app.receiver = [];
  }

  const alreadyAdded = app.receiver.some((item) => item?.$?.['android:name'] === receiverName);
  if (alreadyAdded) return;

  app.receiver.push({
    $: {
      'android:name': receiverName,
      'android:exported': 'true',
      'android:label': label,
    },
    'intent-filter': [
      {
        action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
      },
    ],
    'meta-data': [
      {
        $: {
          'android:name': 'android.appwidget.provider',
          'android:resource': infoXml,
        },
      },
    ],
  });
}

function appendStrings(stringsPath, entries) {
  const lines = entries.map(([name, value]) => `    <string name="${name}" translatable="false">${value}</string>`);

  if (fs.existsSync(stringsPath)) {
    let strings = fs.readFileSync(stringsPath, 'utf8');
    for (const line of lines) {
      const name = line.match(/name="([^"]+)"/)?.[1];
      if (name && !strings.includes(`name="${name}"`)) {
        strings = strings.replace('</resources>', `${line}\n</resources>`);
      }
    }
    fs.writeFileSync(stringsPath, strings);
    return;
  }

  fs.mkdirSync(path.dirname(stringsPath), { recursive: true });
  fs.writeFileSync(
    stringsPath,
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${lines.join('\n')}\n</resources>\n`,
  );
}

function withRecordWidget(config) {
  config = withAndroidManifest(config, (manifestConfig) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifestConfig.modResults);
    for (const receiver of WIDGET_RECEIVERS) {
      ensureWidgetReceiver(app, receiver.name, receiver.label, receiver.infoXml);
    }
    ensureToggleReceiver(app, TOGGLE_RECEIVER.name, TOGGLE_RECEIVER.action);
    return manifestConfig;
  });

  config = withMainApplication(config, (mainAppConfig) => {
    let contents = mainAppConfig.modResults.contents;
    if (!contents.includes('WidgetSyncPackage')) {
      contents = contents.replace(
        'val packages = PackageList(this).packages',
        'val packages = PackageList(this).packages.apply { add(WidgetSyncPackage()) }',
      );
    }
    mainAppConfig.modResults.contents = contents;
    return mainAppConfig;
  });

  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const packageName = modConfig.android?.package ?? 'com.voicesecretary.app';
      const packagePath = packageName.replace(/\./g, '/');
      const androidRoot = path.join(modConfig.modRequest.platformProjectRoot, 'app/src/main');
      const javaDir = path.join(androidRoot, 'java', packagePath);

      for (const fileName of KOTLIN_FILES) {
        copyIfExists(path.join(PLUGIN_ANDROID, fileName), path.join(javaDir, fileName));
      }

      for (const [fileName, destRel] of Object.entries(LAYOUT_FILES)) {
        copyIfExists(path.join(PLUGIN_ANDROID, fileName), path.join(androidRoot, destRel));
      }

      for (const [fileName, destRel] of Object.entries(XML_FILES)) {
        copyIfExists(path.join(PLUGIN_ANDROID, fileName), path.join(androidRoot, destRel));
      }

      for (const [fileName, destRel] of Object.entries(DRAWABLE_FILES)) {
        copyIfExists(path.join(PLUGIN_ANDROID, fileName), path.join(androidRoot, destRel));
      }

      copyIfExists(
        path.join(PLUGIN_ANDROID, 'widget_styles.xml'),
        path.join(androidRoot, 'res/values/widget_styles.xml'),
      );

      appendStrings(path.join(androidRoot, 'res/values/strings.xml'), WIDGET_STRINGS);

      return modConfig;
    },
  ]);

  return config;
}

module.exports = withRecordWidget;
