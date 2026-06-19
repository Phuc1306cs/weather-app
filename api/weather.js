module.exports = async function handler(req, res) {
  const { city } = req.query;

  if (!city) {
    return res.status(400).json({
      message: "Vui lòng nhập tên thành phố."
    });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      message: "Server chưa cấu hình OpenWeather API Key."
    });
  }

  try {
    const apiUrl =
      `https://api.openweathermap.org/data/2.5/weather` +
      `?q=${encodeURIComponent(city)}` +
      `&appid=${apiKey}` +
      `&units=metric` +
      `&lang=vi`;

    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Không tìm thấy thành phố hoặc API bị lỗi."
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      message: "Không thể kết nối đến OpenWeather API."
    });
  }
};