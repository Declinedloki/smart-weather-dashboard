const apiKey = "ee4ff57993005fabb8848e5bf325e5d8";

const searchForm = document.getElementById("search-form");
const cityInput = document.getElementById("city-input");
const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history");

const currentWeatherSection = document.getElementById("current-weather");
const forecastSection = document.getElementById("forecast-section");
const forecastContainer = document.getElementById("forecast-container");

const cityNameEl = document.getElementById("city-name");
const coordsEl = document.getElementById("coords");
const tempEl = document.getElementById("temp");
const humidityEl = document.getElementById("humidity");
const windEl = document.getElementById("wind");
const conditionEl = document.getElementById("condition");
const weatherIconEl = document.getElementById("weather-icon");
const toggleUnitBtn = document.getElementById("toggle-unit");

let isFahrenheit = true;
let currentCityLabel = "";
let savedCities = JSON.parse(localStorage.getItem("weatherSearches")) || [];

function showModal(message) {
  document.getElementById("modal-message").textContent = message;
  const errorModal = new bootstrap.Modal(document.getElementById("errorModal"));
  errorModal.show();
}

function saveCity(city) {
  const normalized = city.trim();

  if (!savedCities.includes(normalized)) {
    savedCities.unshift(normalized);
    savedCities = savedCities.slice(0, 8);
    localStorage.setItem("weatherSearches", JSON.stringify(savedCities));
    renderHistory();
  }
}

function renderHistory() {
  historyList.innerHTML = "";

  if (savedCities.length === 0) {
    historyList.innerHTML = `<p class="text-muted mb-0">No recent searches yet.</p>`;
    return;
  }

  savedCities.forEach((city) => {
    const btn = document.createElement("button");
    btn.className = "btn btn-outline-primary history-btn";
    btn.textContent = city;
    btn.addEventListener("click", () => {
      fetchWeatherByCity(city);
    });
    historyList.appendChild(btn);
  });
}

function convertTemp(tempF) {
  if (isFahrenheit) {
    return `${tempF.toFixed(1)} °F`;
  }

  const tempC = (tempF - 32) * 5 / 9;
  return `${tempC.toFixed(1)} °C`;
}

async function getCoordinates(city) {
  const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`;
  const response = await fetch(geoUrl);

  if (!response.ok) {
    throw new Error("Unable to get location coordinates.");
  }

  const data = await response.json();

  if (!data.length) {
    throw new Error("City not found. Please enter a valid city name.");
  }

  return {
    name: data[0].name,
    state: data[0].state || "",
    country: data[0].country,
    lat: data[0].lat,
    lon: data[0].lon
  };
}

async function getCurrentWeather(lat, lon) {
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
  const response = await fetch(weatherUrl);

  if (!response.ok) {
    throw new Error("Unable to load current weather.");
  }

  return await response.json();
}

async function getForecast(lat, lon) {
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`;
  const response = await fetch(forecastUrl);

  if (!response.ok) {
    throw new Error("Unable to load 5-day forecast.");
  }

  return await response.json();
}

function displayCurrentWeather(data, locationInfo) {
  currentWeatherSection.classList.remove("d-none");

  const fullLocation = locationInfo.state
    ? `${locationInfo.name}, ${locationInfo.state}, ${locationInfo.country}`
    : `${locationInfo.name}, ${locationInfo.country}`;

  cityNameEl.textContent = fullLocation;
  coordsEl.textContent = `${locationInfo.lat.toFixed(4)}, ${locationInfo.lon.toFixed(4)}`;
  tempEl.textContent = convertTemp(data.main.temp);
  humidityEl.textContent = `${data.main.humidity}%`;
  windEl.textContent = `${data.wind.speed} MPH`;
  conditionEl.textContent = data.weather[0].description;
  weatherIconEl.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
  weatherIconEl.alt = data.weather[0].description;
}

function displayForecast(data) {
  forecastSection.classList.remove("d-none");
  forecastContainer.innerHTML = "";

  const noonForecasts = data.list.filter((item) =>
    item.dt_txt.includes("12:00:00")
  );

  noonForecasts.slice(0, 5).forEach((day) => {
    const col = document.createElement("div");
    col.className = "col-md-6 col-xl-4";

    const date = new Date(day.dt_txt).toLocaleDateString();

    col.innerHTML = `
      <div class="forecast-card">
        <h3 class="h5">${date}</h3>
        <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png" alt="${day.weather[0].description}" />
        <p><strong>Temp:</strong> ${convertTemp(day.main.temp)}</p>
        <p><strong>Humidity:</strong> ${day.main.humidity}%</p>
        <p><strong>Wind:</strong> ${day.wind.speed} MPH</p>
        <p><strong>Condition:</strong> ${day.weather[0].description}</p>
      </div>
    `;

    forecastContainer.appendChild(col);
  });
}

async function fetchWeatherByCity(city) {
  try {
    const locationInfo = await getCoordinates(city);
    const currentWeather = await getCurrentWeather(locationInfo.lat, locationInfo.lon);
    const forecast = await getForecast(locationInfo.lat, locationInfo.lon);

    currentCityLabel = city;

    displayCurrentWeather(currentWeather, locationInfo);
    displayForecast(forecast);
    saveCity(city);
  } catch (error) {
    showModal(error.message);
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const city = cityInput.value.trim();

  if (!city) {
    showModal("Please enter a city name before searching.");
    return;
  }

  fetchWeatherByCity(city);
  cityInput.value = "";
});

clearHistoryBtn.addEventListener("click", () => {
  savedCities = [];
  localStorage.removeItem("weatherSearches");
  renderHistory();
});

toggleUnitBtn.addEventListener("click", () => {
  isFahrenheit = !isFahrenheit;
  toggleUnitBtn.textContent = isFahrenheit ? "Switch to °C" : "Switch to °F";

  if (currentCityLabel) {
    fetchWeatherByCity(currentCityLabel);
  }
});

renderHistory();