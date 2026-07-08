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

const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const logoutBtn = document.getElementById("logoutBtn");
const authForm = document.getElementById("authForm");
const userInfo = document.getElementById("userInfo");
const currentUsername = document.getElementById("currentUsername");
const authStatus = document.getElementById("authStatus");
const authToggleBtn = document.getElementById("authToggleBtn");
const authPanel = document.getElementById("authPanel");

let map = null;
let marker = null;
let currentWeatherData = null;

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
      getWeatherByCoords(position.coords.latitude, position.coords.longitude);
    },
    function () {
      hideLoading();
      showError("Không thể lấy vị trí. Vui lòng cho phép quyền định vị.");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
});

saveLocationBtn.addEventListener("click", saveCurrentLocation);
loginBtn.addEventListener("click", loginUser);
registerBtn.addEventListener("click", registerUser);
logoutBtn.addEventListener("click", logoutUser);
authToggleBtn.addEventListener("click", toggleAuthPanel);

window.addEventListener("load", function () {
  updateAuthUI();

  const lastCity = localStorage.getItem("lastCity");

  if (lastCity) {
    cityInput.value = lastCity;
    getWeatherByCity(lastCity);
  } else {
    cityInput.value = "Ho Chi Minh";
    getWeatherByCity("Ho Chi Minh");
  }

  loadSavedLocations();
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
  currentWeatherData = data;

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

  document.getElementById("temperature").textContent =
    `${Math.round(data.main.temp)}°C`;

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

  showWeatherCard();

  if (coord && typeof coord.lat === "number" && typeof coord.lon === "number") {
    updateMap(coord.lat, coord.lon, cityName, country, Math.round(data.main.temp));
    loadForecast(coord.lat, coord.lon);
  }
}

function updateMap(lat, lon, cityName, country, temp) {
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

  const temperatureIcon = L.divIcon({
    className: "temperature-marker-wrapper",
    html: `
      <div class="temperature-marker">
        🌡️ ${temp}°C
      </div>
    `,
    iconSize: [90, 42],
    iconAnchor: [45, 42],
    popupAnchor: [0, -42]
  });

  if (!marker) {
    marker = L.marker([lat, lon], {
      icon: temperatureIcon
    }).addTo(map);
  } else {
    marker.setLatLng([lat, lon]);
    marker.setIcon(temperatureIcon);
  }

  const popupTitle = country ? `${cityName}, ${country}` : cityName;

  marker
    .bindPopup(`
      <b>${popupTitle}</b><br>
      Nhiệt độ: ${temp}°C<br>
      Vĩ độ: ${lat.toFixed(4)}<br>
      Kinh độ: ${lon.toFixed(4)}
    `)
    .openPopup();

  setTimeout(function () {
    map.invalidateSize();
  }, 100);
}

async function loadForecast(lat, lon) {
  forecastList.innerHTML = `<p class="empty-text">Đang tải dự báo 5 ngày...</p>`;

  try {
    const response = await fetch(`/api/forecast?lat=${lat}&lon=${lon}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Không thể tải dự báo.");
    }

    renderForecast(result.daily || []);
  } catch (error) {
    forecastList.innerHTML = `<p class="empty-text">${error.message}</p>`;
  }
}

function renderForecast(days) {
  if (!days.length) {
    forecastList.innerHTML = `<p class="empty-text">Chưa có dữ liệu dự báo.</p>`;
    return;
  }

  forecastList.innerHTML = "";

  days.forEach(function (day) {
    const card = document.createElement("div");
    card.className = "forecast-card";

    card.innerHTML = `
      <h4>${formatForecastDate(day.date)}</h4>
      <img src="https://openweathermap.org/img/wn/${day.icon}@2x.png" alt="${day.description}">
      <div class="forecast-temp">${day.temp_min}°C / ${day.temp_max}°C</div>
      <p class="forecast-desc">${capitalizeFirstLetter(day.description)}</p>
      <div class="forecast-meta">
        💧 ${day.humidity}%<br>
        🌬️ ${day.wind_kmh} km/h<br>
        🌧️ ${day.rain_chance}%
      </div>
    `;

    forecastList.appendChild(card);
  });
}

function toggleAuthPanel() {
  authPanel.classList.toggle("hidden");
}

async function registerUser() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    showAuthStatus("Vui lòng nhập tên đăng nhập và mật khẩu.", true);
    return;
  }

  try {
    showAuthStatus("Đang đăng ký...", false);

    const response = await fetch("/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Đăng ký thất bại.");
    }

    localStorage.setItem("weatherUser", JSON.stringify(result.user));
    passwordInput.value = "";

    updateAuthUI();
    authPanel.classList.add("hidden");
    loadSavedLocations();

    showAuthStatus("✅ Đăng ký và đăng nhập thành công.", false);
  } catch (error) {
    showAuthStatus(`❌ ${error.message}`, true);
  }
}

async function loginUser() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    showAuthStatus("Vui lòng nhập tên đăng nhập và mật khẩu.", true);
    return;
  }

  try {
    showAuthStatus("Đang đăng nhập...", false);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Đăng nhập thất bại.");
    }

    localStorage.setItem("weatherUser", JSON.stringify(result.user));
    passwordInput.value = "";

    updateAuthUI();
    authPanel.classList.add("hidden");
    loadSavedLocations();

    showAuthStatus("✅ Đăng nhập thành công.", false);
  } catch (error) {
    showAuthStatus(`❌ ${error.message}`, true);
  }
}

function logoutUser() {
  localStorage.removeItem("weatherUser");
  updateAuthUI();
  loadSavedLocations();
  showAuthStatus("Đã đăng xuất.", false);
}

function getCurrentUser() {
  const user = localStorage.getItem("weatherUser");

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user);
  } catch {
    localStorage.removeItem("weatherUser");
    return null;
  }
}

function updateAuthUI() {
  const user = getCurrentUser();

  if (user) {
    authForm.classList.add("hidden");
    userInfo.classList.remove("hidden");
    currentUsername.textContent = user.username;
    authToggleBtn.textContent = `👤 ${user.username}`;
  } else {
    authForm.classList.remove("hidden");
    userInfo.classList.add("hidden");
    currentUsername.textContent = "--";
    authToggleBtn.textContent = "👤 Đăng nhập";
  }
}

function showAuthStatus(message, isError) {
  authStatus.textContent = message;
  authStatus.style.color = isError ? "#dc2626" : "#16a34a";
}

async function saveCurrentLocation() {
  const user = getCurrentUser();

  if (!user) {
    showSaveStatus("Bạn cần đăng nhập trước khi lưu vị trí.", true);
    authPanel.classList.remove("hidden");
    return;
  }

  if (!currentWeatherData) {
    showSaveStatus("Chưa có vị trí để lưu. Vui lòng tìm kiếm trước.", true);
    return;
  }

  const coord = currentWeatherData.coord;

  if (!coord || typeof coord.lat !== "number" || typeof coord.lon !== "number") {
    showSaveStatus("Dữ liệu tọa độ không hợp lệ.", true);
    return;
  }

  const city = currentWeatherData.name || "Không xác định";
  const country = currentWeatherData.sys?.country || "";
  const displayAddress = country ? `${city}, ${country}` : city;

  const payload = {
    user_id: user.id,
    city,
    country,
    display_address: displayAddress,
    latitude: coord.lat,
    longitude: coord.lon,
    temperature: currentWeatherData.main?.temp,
    humidity: currentWeatherData.main?.humidity
  };

  try {
    showSaveStatus("Đang lưu vị trí...", false);

    const response = await fetch("/api/save-location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Không thể lưu vị trí.");
    }

    showSaveStatus(`✅ Đã lưu: ${displayAddress}`, false);
    loadSavedLocations();
  } catch (error) {
    showSaveStatus(`❌ ${error.message}`, true);
  }
}

async function loadSavedLocations() {
  const user = getCurrentUser();

  if (!user) {
    savedLocationsList.innerHTML =
      `<p class="empty-text">Vui lòng đăng nhập để xem vị trí đã lưu.</p>`;
    return;
  }

  try {
    const response = await fetch(
      `/api/saved-locations?user_id=${encodeURIComponent(user.id)}`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Không thể tải vị trí đã lưu.");
    }

    renderSavedLocations(result.data || []);
  } catch (error) {
    savedLocationsList.innerHTML =
      `<p class="empty-text">Không thể tải danh sách vị trí đã lưu.</p>`;
  }
}

function renderSavedLocations(locations) {
  if (!locations.length) {
    savedLocationsList.innerHTML =
      `<p class="empty-text">Chưa có vị trí nào được lưu.</p>`;
    return;
  }

  savedLocationsList.innerHTML = "";

  locations.forEach(function (location) {
    const item = document.createElement("div");
    item.className = "saved-item";

    const temp =
      location.temperature !== null && location.temperature !== undefined
        ? `${Math.round(location.temperature)}°C`
        : "--";

    item.innerHTML = `
      <h4>${location.display_address || location.city || "Không xác định"}</h4>
      <p>${temp} · Độ ẩm ${location.humidity ?? "--"}% · Lưu ${location.save_count} lần</p>

      <div class="saved-actions">
        <button type="button" class="view-saved-btn">Xem</button>
        <button type="button" class="delete-saved-btn">Xóa</button>
      </div>
    `;

    item.querySelector(".view-saved-btn").addEventListener("click", function () {
      if (location.city) {
        cityInput.value = location.city;
        getWeatherByCity(location.city);
      } else {
        getWeatherByCoords(location.latitude, location.longitude);
      }
    });

    item.querySelector(".delete-saved-btn").addEventListener("click", function () {
      deleteSavedLocation(location.id);
    });

    savedLocationsList.appendChild(item);
  });
}

async function deleteSavedLocation(id) {
  const user = getCurrentUser();

  if (!user) {
    alert("Bạn cần đăng nhập để xóa vị trí.");
    authPanel.classList.remove("hidden");
    return;
  }

  try {
    const response = await fetch("/api/saved-locations", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: user.id,
        id
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Không thể xóa vị trí.");
    }

    loadSavedLocations();
  } catch (error) {
    alert(error.message);
  }
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

function formatForecastDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);

  return new Intl.DateTimeFormat("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
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

function showSaveStatus(message, isError) {
  saveStatus.textContent = message;
  saveStatus.style.color = isError ? "#dc2626" : "#16a34a";
}