module.exports = async function handler(req, res) {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        ok: false,
        message: "Thiếu OPENWEATHER_API_KEY trên Vercel."
      });
    }

    const url =
      `https://api.openweathermap.org/data/2.5/weather?q=Ho Chi Minh&appid=${apiKey}&units=metric&lang=vi`;

    const response = await fetch(url);
    const text = await response.text();

    return res.status(response.status).json({
      ok: response.ok,
      status: response.status,
      apiKeyLength: apiKey.length,
      body: text
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: "Fetch OpenWeather bị lỗi.",
      name: error.name,
      detail: error.message,
      cause: error.cause ? String(error.cause) : null
    });
  }
};