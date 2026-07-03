const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const weatherCard = document.getElementById("weatherCard");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("errorMessage");
const locationBtn = document.getElementById("locationBtn");
const quickCityButtons = document.querySelectorAll(".quick-cities button");
const saveLocationBtn = document.getElementById("saveLocationBtn");
const saveStatus = document.getElementById("saveStatus");
const savedLocationsList = document.getElementById("savedLocationsList");
const forecastList = document.getElementById("forecastList");

let map = null;
let marker = null;

searchForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const city = cityInput.value.trim();

  if (!city) {
    showError("Vui lòng nhập tên thành phố.");
    return;
  }

  getWeatherByCity(city);
});

quickCityButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    const city = button.dataset.city;
    cityInput.value = city;
    getWeatherByCity(city);
  });
});

locationBtn.addEventListener("click", function () {
  if (!navigator.geolocation) {
    showError("Trình duyệt của bạn không hỗ trợ định vị.");
    return;
  }

  showLoading();
  hideError();
  hideWeatherCard();

  navigator.geolocation.getCurrentPosition(
    function (position) {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      getWeatherByCoords(lat, lon);
    },
    function () {
      hideLoading();
      showError("Không thể lấy vị trí. Vui lòng cho phép quyền định vị trên trình duyệt.");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
});

window.addEventListener("load", function () {
  const lastCity = localStorage.getItem("lastCity");

  if (lastCity) {
    cityInput.value = lastCity;
    getWeatherByCity(lastCity);
  } else {
    cityInput.value = "Ho Chi Minh";
    getWeatherByCity("Ho Chi Minh");
  }
});

async function getWeatherByCity(city) {
  showLoading();
  hideError();
  hideWeatherCard();

  try {
    const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Không tìm thấy dữ liệu thời tiết.");
    }

    localStorage.setItem("lastCity", city);
    displayWeather(data);
  } catch (error) {
    showError(error.message);
  } finally {
    hideLoading();
  }
}

async function getWeatherByCoords(lat, lon) {
  try {
    const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Không tìm thấy dữ liệu thời tiết.");
    }

    cityInput.value = data.name || "Vị trí hiện tại";

    if (data.name) {
      localStorage.setItem("lastCity", data.name);
    }

    displayWeather(data);
  } catch (error) {
    showError(error.message);
  } finally {
    hideLoading();
  }
}

function displayWeather(data) {
  const cityName = data.name || "Không xác định";
  const country = data.sys?.country || "";
  const weather = data.weather?.[0];
  const coord = data.coord;

  document.getElementById("location").textContent = country
    ? `${cityName}, ${country}`
    : cityName;

  document.getElementById("dateTime").textContent = formatCityDate(
    data.dt,
    data.timezone
  );

  document.getElementById("temperature").textContent = `${Math.round(data.main.temp)}°C`;

  document.getElementById("description").textContent =
    capitalizeFirstLetter(weather?.description || "Không có mô tả");

  document.getElementById("humidity").textContent = `${data.main.humidity}%`;

  document.getElementById("wind").textContent =
    `${Math.round(data.wind.speed * 3.6)} km/h`;

  document.getElementById("feelsLike").textContent =
    `${Math.round(data.main.feels_like)}°C`;

  document.getElementById("pressure").textContent =
    `${data.main.pressure} hPa`;

  document.getElementById("visibility").textContent =
    data.visibility ? `${(data.visibility / 1000).toFixed(1)} km` : "Không có";

  document.getElementById("clouds").textContent =
    data.clouds ? `${data.clouds.all}%` : "Không có";

  document.getElementById("sunrise").textContent = formatCityTime(
    data.sys.sunrise,
    data.timezone
  );

  document.getElementById("sunset").textContent = formatCityTime(
    data.sys.sunset,
    data.timezone
  );

  const weatherIcon = document.getElementById("weatherIcon");
  const iconCode = weather?.icon || "01d";

  weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
  weatherIcon.alt = weather?.description || "Weather Icon";

  weatherIcon.onerror = function () {
    this.style.display = "none";
  };

  showWeatherCard();

  if (coord && typeof coord.lat === "number" && typeof coord.lon === "number") {
    updateMap(coord.lat, coord.lon, cityName, country);
  }
}

function updateMap(lat, lon, cityName, country) {
  document.getElementById("mapCoords").textContent =
    `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

  if (!map) {
    map = L.map("map").setView([lat, lon], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap"
    }).addTo(map);
  } else {
    map.setView([lat, lon], 11);
  }

  if (!marker) {
    marker = L.marker([lat, lon]).addTo(map);
  } else {
    marker.setLatLng([lat, lon]);
  }

  const popupTitle = country ? `${cityName}, ${country}` : cityName;

  marker
    .bindPopup(`<b>${popupTitle}</b><br>Vĩ độ: ${lat.toFixed(4)}<br>Kinh độ: ${lon.toFixed(4)}`)
    .openPopup();

  setTimeout(function () {
    map.invalidateSize();
  }, 100);
}

function formatCityDate(timestamp, timezoneOffset) {
  const date = new Date((timestamp + timezoneOffset) * 1000);

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatCityTime(timestamp, timezoneOffset) {
  const date = new Date((timestamp + timezoneOffset) * 1000);

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function capitalizeFirstLetter(text) {
  if (!text) return "";

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function showLoading() {
  loading.classList.remove("hidden");
}

function hideLoading() {
  loading.classList.add("hidden");
}

function showError(message) {
  errorMessage.textContent = `⚠️ ${message}`;
  errorMessage.classList.remove("hidden");
}

function hideError() {
  errorMessage.classList.add("hidden");
}

function showWeatherCard() {
  weatherCard.classList.remove("hidden");
}

function hideWeatherCard() {
  weatherCard.classList.add("hidden");
}