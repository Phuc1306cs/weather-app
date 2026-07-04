function getLocalDateInfo(timestamp, timezoneOffset) {
  const date = new Date((timestamp + timezoneOffset) * 1000);

  return {
    dateKey: date.toISOString().slice(0, 10),
    hour: date.getUTCHours()
  };
}

function groupForecastByDay(forecastData) {
  const timezoneOffset = forecastData.city.timezone || 0;
  const dailyMap = new Map();

  forecastData.list.forEach(function (item) {
    const { dateKey, hour } = getLocalDateInfo(item.dt, timezoneOffset);

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, []);
    }

    dailyMap.get(dateKey).push({
      ...item,
      localHour: hour
    });
  });

  const dailyForecast = [];

  dailyMap.forEach(function (items, dateKey) {
    const temps = items.map((item) => item.main.temp);
    const humidities = items.map((item) => item.main.humidity);
    const winds = items.map((item) => item.wind.speed);
    const pops = items.map((item) => item.pop || 0);

    const representative =
      items.find((item) => item.localHour >= 11 && item.localHour <= 14) ||
      items[Math.floor(items.length / 2)] ||
      items[0];

    dailyForecast.push({
      date: dateKey,
      temp_min: Math.round(Math.min(...temps)),
      temp_max: Math.round(Math.max(...temps)),
      humidity: Math.round(
        humidities.reduce((sum, value) => sum + value, 0) / humidities.length
      ),
      wind_kmh: Math.round(Math.max(...winds) * 3.6),
      rain_chance: Math.round(Math.max(...pops) * 100),
      description: representative.weather[0].description,
      icon: representative.weather[0].icon
    });
  });

  return dailyForecast.slice(0, 5);
}

module.exports = async function handler(req, res) {
  const city = req.query.city?.trim();
  const lat = req.query.lat;
  const lon = req.query.lon;

  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      message: "Server chưa cấu hình OpenWeather API Key."
    });
  }

  if (!city && (!lat || !lon)) {
    return res.status(400).json({
      message: "Vui lòng nhập thành phố hoặc tọa độ."
    });
 
    const params = new URLSearchParams({
      appid: apiKey,
      units: "metric",
      lang: "vi"
    });

    if (city) {
      params.set("q", city);
    } else {
      params.set("lat", lat);
      params.set("lon", lon);
    }

    const apiUrl =
      `https://api.openweathermap.org/data/2.5/forecast?${params.toString()}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        message: data.message || "Không thể lấy dữ liệu dự báo."
      });
    }

    return res.status(200).json({
      city: data.city,
      daily: groupForecastByDay(data)
    });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể kết nối đến OpenWeather Forecast API."
    });
  }
};