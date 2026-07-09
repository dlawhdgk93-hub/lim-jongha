const {
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PLUGIN_ANDROID = path.join(__dirname, 'android');

function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function withRecordWidget(config) {
  config = withAndroidManifest(config, (manifestConfig) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifestConfig.modResults);
    if (!Array.isArray(app.receiver)) {
      app.receiver = [];
    }

    const alreadyAdded = app.receiver.some(
      (item) => item?.$?.['android:name'] === '.RecordWidgetProvider',
    );
    if (!alreadyAdded) {
      app.receiver.push({
        $: {
          'android:name': '.RecordWidgetProvider',
          'android:exported': 'true',
          'android:label': '팀데이 녹음',
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
              'android:resource': '@xml/record_widget_info',
            },
          },
        ],
      });
    }

    return manifestConfig;
  });

  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      const packageName = modConfig.android?.package ?? 'com.voicesecretary.app';
      const packagePath = packageName.replace(/\./g, '/');
      const androidRoot = path.join(modConfig.modRequest.platformProjectRoot, 'app/src/main');
      const javaDir = path.join(androidRoot, 'java', packagePath);

      copyIfExists(
        path.join(PLUGIN_ANDROID, 'RecordWidgetProvider.kt'),
        path.join(javaDir, 'RecordWidgetProvider.kt'),
      );
      copyIfExists(
        path.join(PLUGIN_ANDROID, 'widget_record.xml'),
        path.join(androidRoot, 'res/layout/widget_record.xml'),
      );
      copyIfExists(
        path.join(PLUGIN_ANDROID, 'record_widget_info.xml'),
        path.join(androidRoot, 'res/xml/record_widget_info.xml'),
      );
      copyIfExists(
        path.join(PLUGIN_ANDROID, 'widget_record_bg.xml'),
        path.join(androidRoot, 'res/drawable/widget_record_bg.xml'),
      );

      const stringsPath = path.join(androidRoot, 'res/values/strings.xml');
      const widgetString = '    <string name="widget_record_desc" translatable="false">바로 음성 기록</string>';
      if (fs.existsSync(stringsPath)) {
        let strings = fs.readFileSync(stringsPath, 'utf8');
        if (!strings.includes('widget_record_desc')) {
          strings = strings.replace('</resources>', `${widgetString}\n</resources>`);
          fs.writeFileSync(stringsPath, strings);
        }
      } else {
        fs.mkdirSync(path.dirname(stringsPath), { recursive: true });
        fs.writeFileSync(
          stringsPath,
          `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${widgetString}\n</resources>\n`,
        );
      }

      return modConfig;
    },
  ]);

  return config;
}

module.exports = withRecordWidget;
