// --- 設定部分 ---
const OPENWEATHER_API_KEY = 'bedf34d44f47652916c8687ea0b93385'; // あなたのOpenWeatherMap APIキー
const LATITUDE = 35.717; // 東京都墨田区文花２丁目２の緯度 (概算値)
const LONGITUDE = 139.816; // 東京都墨田区文花２丁目２の経度 (概算値)
const CALENDAR_ID = 'primary'; // イベントを追加したいGoogleカレンダーのID (通常は 'primary' で自分のメインカレンダー)

// --- 気象条件の閾値設定 ---
const THRESHOLDS = {
  // 雨の閾値 (OpenWeatherMapの天気コード)
  RAIN_CODES: [
    200, 201, 202, 210, 211, 212, 221, 230, 231, 232, // Thunderstorm
    300, 301, 302, 310, 311, 312, 313, 314, 321,    // Drizzle
    500, 501, 502, 503, 504, 511, 520, 521, 522, 531, // Rain
    // 6xxは雪ですが、雨予報に含めない場合は削除してください
    // 600, 601, 602, 611, 612, 613, 615, 616, 620, 621, 622
  ],
  // 熱中症注意の閾値 (気温℃, 湿度%)
  HEATSTROKE_ALERT_TEMP: 30, // 気温30℃以上
  HEATSTROKE_ALERT_HUMIDITY: 70, // 湿度70%以上
  // 外出禁止（猛暑）の閾値 (気温℃)
  EXTREME_HEAT_TEMP: 35, // 気温35℃以上
  // 低体温症注意の閾値 (気温℃)
  HYPOTHERMIA_TEMP: 5,
  // 強風注意の閾値 (風速 m/s)
  STRONG_WIND_SPEED: 10
};

// --- タスクタイトルの設定 ---
const TASK_TITLES = {
  RAIN: '雨予報',
  HEATSTROKE_ALERT: '熱中症注意',
  EXTREME_HEAT: '外出禁止（猛暑）',
  HYPOTHERMIA: '低体温症注意',
  STRONG_WIND: '強風注意'
};

// --- タスクの色の設定 (GoogleカレンダーのカラーID) ---
// Googleカレンダーの色IDと対応する色（数値の文字列で指定）
// 1: Lavender (薄紫), 2: Sage (緑), 3: Grape (紫), 4: Flamingo (薄いピンク),
// 5: Banana (黄), 6: Orange (オレンジ), 7: Blue (青), 8: Gray (灰), 9: Blueberry (紫), 10: Graphite (灰色), 11: Default

const TASK_COLORS = {
  RAIN: '7',  // 雨：青（Blue）
  HEATSTROKE_ALERT: '6', // 熱中症注意：オレンジ (Orange)
  EXTREME_HEAT: '3', // 外出禁止（猛暑）：紫 (Grape)
  HYPOTHERMIA: '1',  // 低体温注意：薄紫 (Lavender)
  STRONG_WIND: '2'   // 緑 (Sage)
};

// --- タスクの詳細説明 ---
const TASK_DESCRIPTIONS = {
  RAIN: 'OpenWeatherMapの予報に基づき、傘を持って行きましょう。',
  HEATSTROKE_ALERT: 'OpenWeatherMapの予報に基づき、熱中症に警戒し、水分補給や休憩を心がけましょう。',
  EXTREME_HEAT: 'OpenWeatherMapの予報に基づき、気温35℃以上の猛暑が予想されます。外出は原則控えてください。',
  HYPOTHERMIA: 'OpenWeatherMapの予報に基づき、低体温症に注意し、防寒対策を万全にしましょう。',
  STRONG_WIND: 'OpenWeatherMapの予報に基づき、強風に注意し、屋外活動は控えめにしましょう。'
};

// --- 主要関数 ---
function checkAndManageWeatherTasks() {
  const weatherApi = new OpenWeatherMapAPI(OPENWEATHER_API_KEY, LATITUDE, LONGITUDE);
  const calendarManager = new GoogleCalendarManager(CALENDAR_ID);

  try {
    const dailyForecasts = weatherApi.getAggregatedDailyForecasts();

    // 今日から4日後までの各日についてタスクを管理
    for (let d = 0; d < 5; d++) { // d=0:今日, d=1:明日, ..., d=4:4日後
      const targetDate = new Date();
      targetDate.setHours(0, 0, 0, 0); // 今日の始まり
      targetDate.setDate(targetDate.getDate() + d); // 該当日の00:00:00

      const dateKey = targetDate.getTime(); // 日付のタイムスタンプ

      const hazardsOnDate = dailyForecasts.get(dateKey) || {
        isRainy: false,
        isHeatstrokeAlert: false,
        isExtremeHeat: false,
        isCold: false,
        isWindy: false
      };

      // 各リスクに応じたタスクの管理 (色指定)
      calendarManager.manageTask(targetDate, TASK_TITLES.RAIN, TASK_DESCRIPTIONS.RAIN, TASK_COLORS.RAIN, hazardsOnDate.isRainy);
      calendarManager.manageTask(targetDate, TASK_TITLES.HEATSTROKE_ALERT, TASK_DESCRIPTIONS.HEATSTROKE_ALERT, TASK_COLORS.HEATSTROKE_ALERT, hazardsOnDate.isHeatstrokeAlert);
      calendarManager.manageTask(targetDate, TASK_TITLES.EXTREME_HEAT, TASK_DESCRIPTIONS.EXTREME_HEAT, TASK_COLORS.EXTREME_HEAT, hazardsOnDate.isExtremeHeat);
      calendarManager.manageTask(targetDate, TASK_TITLES.HYPOTHERMIA, TASK_DESCRIPTIONS.HYPOTHERMIA, TASK_COLORS.HYPOTHERMIA, hazardsOnDate.isCold);
      calendarManager.manageTask(targetDate, TASK_TITLES.STRONG_WIND, TASK_DESCRIPTIONS.STRONG_WIND, TASK_COLORS.STRONG_WIND, hazardsOnDate.isWindy);
    }

  } catch (e) {
    Logger.log('エラーが発生しました: ' + e.toString());
    if (e.toString().includes("401")) {
      Logger.log("APIキーが無効である可能性があります。OpenWeatherMapのAPIキーを確認してください。");
    }
  }
}


// --- クラス定義 ---

/**
 * OpenWeatherMap APIとの通信を管理するクラス
 */
class OpenWeatherMapAPI {
  constructor(apiKey, latitude, longitude) {
    this.apiKey = apiKey;
    this.latitude = latitude;
    this.longitude = longitude;
    this.baseUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${this.latitude}&lon=${this.longitude}&appid=${this.apiKey}&units=metric&lang=ja`;
  }

  /**
   * OpenWeatherMap APIから予報データを取得し、集約して返す
   * @returns {Map<number, object>} 日付（タイムスタンプ）をキーとした、その日の気象リスクフラグのマップ
   */
  getAggregatedDailyForecasts() {
    const response = UrlFetchApp.fetch(this.baseUrl);
    const json = JSON.parse(response.getContentText());

    if (!json || !json.list) {
      throw new Error('天気データが見つからないか、APIレスポンスの形式が不正です。');
    }

    const dailyHazards = new Map(); // key: 日付のタイムスタンプ (00:00:00), value: {isRainy:bool, isHeatstrokeAlert:bool, isExtremeHeat:bool, ...}

    const today = new Date();
    today.setHours(0, 0, 0, 0); // 今日の00:00:00

    // 今日から4日後までの予報をチェック (合計5日分)
    const checkEndDate = new Date(today);
    checkEndDate.setDate(today.getDate() + 5);

    for (const forecast of json.list) {
      const forecastTime = new Date(forecast.dt * 1000); // 予報の時間

      // 予報がチェック期間内か確認
      if (forecastTime >= today && forecastTime < checkEndDate) {
        const forecastDate = new Date(forecastTime);
        forecastDate.setHours(0, 0, 0, 0); // その日の00:00:00に設定
        const dateKey = forecastDate.getTime();

        // 既存のリスク情報があれば取得、なければ初期化
        const currentHazards = dailyHazards.get(dateKey) || {
          isRainy: false,
          isHeatstrokeAlert: false,
          isExtremeHeat: false,
          isCold: false,
          isWindy: false
        };

        // 天気コードによる雨判断
        if (THRESHOLDS.RAIN_CODES.includes(forecast.weather[0].id)) {
          currentHazards.isRainy = true;
        }

        // 気温・湿度による熱中症注意判断 (OR条件)
        if (forecast.main.temp >= THRESHOLDS.HEATSTROKE_ALERT_TEMP || forecast.main.humidity >= THRESHOLDS.HEATSTROKE_ALERT_HUMIDITY) {
          currentHazards.isHeatstrokeAlert = true;
        }

        // 気温による外出禁止（猛暑）判断
        if (forecast.main.temp >= THRESHOLDS.EXTREME_HEAT_TEMP) {
          currentHazards.isExtremeHeat = true;
        }

        // 気温による低体温症判断
        if (forecast.main.temp <= THRESHOLDS.HYPOTHERMIA_TEMP) {
          currentHazards.isCold = true;
        }

        // 風速による強風判断
        if (forecast.wind.speed >= THRESHOLDS.STRONG_WIND_SPEED) {
          currentHazards.isWindy = true;
        }

        dailyHazards.set(dateKey, currentHazards);
      }
    }
    return dailyHazards;
  }
}

/**
 * Google Calendarのタスクを管理するクラス
 */
class GoogleCalendarManager {
  constructor(calendarId) {
    this.calendar = CalendarApp.getCalendarById(calendarId);
    this.taskStartHour = 6;
    this.taskStartMinute = 0;
    this.taskDurationMinutes = 30; // 6:00 - 6:30
  }

  /**
   * 特定の日の特定のタスクを存在させるか削除するかを管理する
   * @param {Date} targetDate - 管理対象の日付 (時刻は00:00:00推奨)
   * @param {string} taskTitle - タスクのタイトル
   * @param {string} taskDescription - タスクの説明
   * @param {string} taskColor - タスクの色 (Google Calendar APIのカラーID文字列 '1'～'11')
   * @param {boolean} shouldExist - そのタスクが存在すべきかどうか (true:作成/維持, false:削除)
   */
  manageTask(targetDate, taskTitle, taskDescription, taskColor, shouldExist) {
    const taskStartTime = new Date(targetDate);
    taskStartTime.setHours(this.taskStartHour, this.taskStartMinute, 0, 0);
    const taskEndTime = new Date(taskStartTime.getTime() + this.taskDurationMinutes * 60 * 1000);

    const existingTasks = this.calendar.getEvents(taskStartTime, taskEndTime, {
      title: taskTitle
    });

    if (shouldExist) {
      // タスクが存在すべき場合
      if (existingTasks.length === 0) {
        // 既存のタスクがなければ作成
        const newEvent = this.calendar.createEvent(taskTitle, taskStartTime, taskEndTime, {
          description: taskDescription
        });
        newEvent.setColor(taskColor); // ここで色が設定されます
        Logger.log(`${targetDate.toLocaleDateString()}にタスク "${taskTitle}" を色 ${taskColor} で作成しました。`);
      } else {
        // 既存のタスクがあれば、説明と色を最新に更新（オプション）
        // existingTasks[0].setDescription(taskDescription); // 必要に応じてコメント解除
        // existingTasks[0].setColor(taskColor); // 必要に応じてコメント解除。既存イベントの色を強制的に更新する場合
        Logger.log(`${targetDate.toLocaleDateString()}にタスク "${taskTitle}" は既に存在します。`);
      }
    } else {
      // タスクが存在すべきでない場合
      if (existingTasks.length > 0) {
        // 既存のタスクがあれば削除
        existingTasks.forEach(event => {
          if (event.getTitle() === taskTitle) { // タイトルが完全に一致する場合のみ削除
            event.deleteEvent();
            Logger.log(`${targetDate.toLocaleDateString()}のタスク "${taskTitle}" を削除しました。`);
          }
        });
      }
    }
  }
}