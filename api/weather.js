const https = require("https");
const dns = require("dns");

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

function fetchOpenWeather(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.openweathermap.org",
      port: 443,
      path,
      method: "GET",
      family: 4,
      timeout: 15000,
      headers: {
        "User-Agent": "weather-app/1.0"
      }
    };

    const request = https.request(options, (response) => {
      let body = "";

      response.setEncoding("utf8");

      response.on("data", (chunk) => {
        body += chunk;
      });

      response.on("end", () => {
        try {
          const data = JSON.parse(body);

          resolve({
            ok: response.statusCode >= 200 && response.statusCode < 300,
            statusCode: response.statusCode,
            data
          });
        } catch (error) {
          reject(new Error("Không thể phân tích dữ liệu từ OpenWeather."));
        }
      });
    });

    request.on("timeout", () => {
      request.destroy(new Error("Kết nối OpenWeather bị timeout."));
    });

    request.on("error", (error) => {
      reject(error);
    });

    request.end();
  });
}

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

    const path = `/data/2.5/weather?${params.toString()}`;

    const result = await fetchOpenWeather(path);

    if (!result.ok) {
      return res.status(result.statusCode).json({
        message: result.data.message || "Không thể lấy dữ liệu thời tiết.",
        detail: result.data
      });
    }

    return res.status(200).json(result.data);
  } catch (error) {
    return res.status(500).json({
      message: "Không thể kết nối đến OpenWeather API.",
      detail: error.message
    });
  }
};