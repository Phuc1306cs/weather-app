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
      message: "Vui lòng nhập tên thành phố hoặc cho phép định vị."
    });
  }

  try {
    let apiUrl = "https://api.openweathermap.org/data/2.5/weather";

    if (city) {
      apiUrl +=
        `?q=${encodeURIComponent(city)}` +
        `&appid=${apiKey}` +
        "&units=metric" +
        "&lang=vi";
    } else {
      apiUrl +=
        `?lat=${encodeURIComponent(lat)}` +
        `&lon=${encodeURIComponent(lon)}` +
        `&appid=${apiKey}` +
        "&units=metric" +
        "&lang=vi";
    }

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({
          message: "Không tìm thấy thành phố. Vui lòng nhập lại tên khác."
        });
      }

      if (response.status === 401) {
        return res.status(401).json({
          message: "OpenWeather API Key không hợp lệ hoặc chưa được kích hoạt."
        });
      }

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