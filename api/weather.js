module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return res.status(405).json({
      message: "Method not allowed"
    });
  }

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
      message: "Vui lòng nhập tên thành phố hoặc cho phép định vị."
    });
  }

  try {
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
      `https://api.openweathermap.org/data/2.5/weather?${params.toString()}`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        message: data.message || "Không thể lấy dữ liệu thời tiết."
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      message: "Không thể kết nối đến OpenWeather API."
    });
  }
};