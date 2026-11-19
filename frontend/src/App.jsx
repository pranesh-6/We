
import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

const MAX_RECENT_CITIES = 3;
const MAX_CHAT_HISTORY_MESSAGES = 8;

const weatherInfo = (code, isDay = true) => {
  const conditions = {
    0: ["Clear sky", isDay ? "☀️" : "🌙"],
    1: ["Mainly clear", isDay ? "🌤️" : "🌙"],
    2: ["Partly cloudy", isDay ? "⛅" : "☁️"],
    3: ["Overcast", "☁️"],
    45: ["Fog", "🌫️"],
    48: ["Depositing rime fog", "🌫️"],
    51: ["Light drizzle", "🌦️"],
    53: ["Drizzle", "🌧️"],
    55: ["Dense drizzle", "🌧️"],
    56: ["Light freezing drizzle", "🌧️"],
    57: ["Dense freezing drizzle", "🌧️"],
    61: ["Light rain", "🌦️"],
    63: ["Rain", "🌧️"],
    65: ["Heavy rain", "🌧️"],
    66: ["Light freezing rain", "🌧️"],
    67: ["Heavy freezing rain", "🌧️"],
    71: ["Light snow", "🌨️"],
    73: ["Snow", "🌨️"],
    75: ["Heavy snow", "🌨️"],
    77: ["Snow grains", "🌨️"],
    80: ["Light rain showers", "🌦️"],
    81: ["Rain showers", "🌧️"],
    82: ["Heavy rain showers", "🌧️"],
    85: ["Light snow showers", "🌨️"],
    86: ["Heavy snow showers", "🌨️"],
    95: ["Thunderstorm", "⛈️"],
    96: ["Thunderstorm with light hail", "⛈️"],
    99: ["Thunderstorm with heavy hail", "⛈️"]
  };

  return conditions[code] ?? ["Unknown conditions", "❔"];
};

const getWeatherTheme = (code, isDay) => {
  if (code === 0 || code === 1) return isDay ? "theme-sunny" : "theme-night";
  if ([2, 3].includes(code)) return "theme-cloudy";
  if ([45, 48].includes(code)) return "theme-fog";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))
    return "theme-rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "theme-snow";
  if (code >= 95 && code <= 99) return "theme-storm";
  return "theme-default";
};

const formatForecastDate = (time) =>
  new Date(`${time.slice(0, 10)}T12:00:00`).toLocaleDateString("en", {
    month: "short",
    day: "numeric"
  });

const readRecentCities = () => {
  try {
    const savedCities = window.localStorage.getItem("weatherai.recentCities");
    const parsedCities = savedCities ? JSON.parse(savedCities) : [];

    if (!Array.isArray(parsedCities)) {
      throw new Error("Recent searches are not stored as a list.");
    }

    const cities = [
      ...new Set(
        parsedCities
          .filter((city) => typeof city === "string")
          .map((city) => city.trim())
          .filter(Boolean)
      )
    ].slice(0, MAX_RECENT_CITIES);

    return { cities, error: "" };
  } catch (storageError) {
    console.error("Unable to load recent city searches.", storageError);
    return {
      cities: [],
      error: "Recent searches could not be loaded from this browser."
    };
  }
};

const readFavouriteCities = () => {
  try {
    const savedCities = window.localStorage.getItem("weatherai.favoriteCities");
    const parsedCities = savedCities ? JSON.parse(savedCities) : [];

    if (!Array.isArray(parsedCities)) {
      throw new Error("Favourite cities are not stored as a list.");
    }

    const cities = [
      ...new Set(
        parsedCities
          .filter((city) => typeof city === "string")
          .map((city) => city.trim())
          .filter(Boolean)
      )
    ];

    return { cities, error: "" };
  } catch (storageError) {
    console.error("Unable to load favourite cities.", storageError);
    return {
      cities: [],
      error: "Favourite cities could not be loaded from this browser."
    };
  }
};

function WeatherAssistantPanel({
  weather,
  suggestions,
  aiInsight,
  aiInsightLoading,
  aiInsightError,
  chatMessages,
  chatInput,
  chatLoading,
  chatError,
  onChatInputChange,
  onChatSubmit
}) {
  return (
    <div className="panel ai-panel">
      <h2>🤖 AI Chatbot</h2>
      <p className="ai-label">SMART WEATHER SUGGESTIONS</p>
      {aiInsightLoading && (
        <p className="ai-status" role="status" aria-live="polite">
          Generating an outlook for {weather.place.name}...
        </p>
      )}
      {aiInsightError && (
        <p className="ai-error" role="alert">
          AI chatbot unavailable: {aiInsightError}
        </p>
      )}
      {aiInsight && <p className="ai-insight">{aiInsight}</p>}
      {suggestions.map((item) => (
        <div className="suggestion" key={item.title}>
          <span aria-hidden="true">{item.icon}</span>
          <div>
            <b>{item.title}</b>
            <p>{item.message}</p>
          </div>
        </div>
      ))}
      <section className="weather-chat" aria-label="Ask about this city's weather">
        <h3>Ask about {weather.place.name}</h3>
        <div
          className="chat-transcript"
          aria-label="Chat messages"
          aria-live="polite"
        >
          {chatMessages.length === 0 ? (
            <p className="chat-empty">
              Ask about the current conditions or this week's forecast.
            </p>
          ) : (
            chatMessages.map((message, index) => (
              <p
                className={`chat-message chat-${message.role}`}
                key={`${message.role}-${index}`}
              >
                <b>{message.role === "user" ? "You" : "WeatherAI"}:</b>{" "}
                {message.content}
              </p>
            ))
          )}
          {chatLoading && (
            <p className="chat-empty" role="status">
              WeatherAI is thinking...
            </p>
          )}
        </div>
        {chatError && (
          <p className="ai-error" role="alert">
            {chatError}
          </p>
        )}
        <form className="chat-form" onSubmit={onChatSubmit}>
          <input
            type="text"
            aria-label={`Ask about ${weather.place.name} weather`}
            value={chatInput}
            onChange={(event) => onChatInputChange(event.target.value)}
            placeholder="Ask a weather question..."
            maxLength={500}
            disabled={chatLoading}
          />
          <button
            type="submit"
            disabled={chatLoading || !chatInput.trim()}
          >
            {chatLoading ? "Sending..." : "Ask"}
          </button>
        </form>
      </section>
    </div>
  );
}

function App() {
  const [search, setSearch] = useState("");
  const [recentSearchState] = useState(readRecentCities);
  const [favouriteSearchState] = useState(readFavouriteCities);
  const [recentCities, setRecentCities] = useState(recentSearchState.cities);
  const [favouriteCities, setFavouriteCities] = useState(
    favouriteSearchState.cities
  );
  const recentCitiesRef = useRef(recentSearchState.cities);
  const chatRequestControllerRef = useRef(null);
  const [recentSearchError, setRecentSearchError] = useState(
    recentSearchState.error
  );
  const [showRecentCities, setShowRecentCities] = useState(false);
  const [activeView, setActiveView] = useState("dashboard");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [favouriteError, setFavouriteError] = useState(
    favouriteSearchState.error
  );
  const [aiInsight, setAiInsight] = useState("");
  const [aiInsightLoading, setAiInsightLoading] = useState(false);
  const [aiInsightError, setAiInsightError] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  const getWeather = useCallback(async (cityName) => {
    chatRequestControllerRef.current?.abort();
    chatRequestControllerRef.current = null;
    setChatMessages([]);
    setChatInput("");
    setChatLoading(false);
    setChatError("");

    try {
      setLoading(true);
      setError("");

      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`
      );

      if (!geoResponse.ok) throw new Error("Location search failed");

      const geoData = await geoResponse.json();

      if (!geoData.results?.length) {
        throw new Error("City not found. Try another city.");
      }

      const place = geoData.results[0];

      const url = new URL("https://api.open-meteo.com/v1/forecast");

      url.search = new URLSearchParams({
        latitude: place.latitude,
        longitude: place.longitude,
        current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,surface_pressure",
        hourly: "temperature_2m,precipitation_probability,weather_code,is_day",
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
        timezone: "auto",
        forecast_days: "7"
      });

      const response = await fetch(url);

      if (!response.ok) throw new Error("Weather service unavailable");

      const data = await response.json();

      setAiInsight("");
      setAiInsightError("");
      setAiInsightLoading(false);
      setWeather({ place, data });

      const nextRecentCities = [
        place.name,
        ...recentCitiesRef.current.filter(
          (city) =>
            city.toLocaleLowerCase() !== place.name.toLocaleLowerCase()
        )
      ].slice(0, MAX_RECENT_CITIES);

      recentCitiesRef.current = nextRecentCities;
      setRecentCities(nextRecentCities);
      setSearch(place.name);

      try {
        window.localStorage.setItem(
          "weatherai.recentCities",
          JSON.stringify(nextRecentCities)
        );
        setRecentSearchError("");
      } catch (storageError) {
        console.error("Unable to save recent city searches.", storageError);
        setRecentSearchError(
          "Recent searches could not be saved in this browser."
        );
      }

      setShowRecentCities(false);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  const selectCity = (cityName) => {
    changeView("dashboard");
    setShowRecentCities(false);
    getWeather(cityName);
  };

  const changeView = (view) => {
    if (activeView === view) return;

    if (view === "chatbot") {
      setAiInsightError("");
      if (weather) setAiInsightLoading(true);
    } else {
      setAiInsightLoading(false);
    }

    setActiveView(view);
  };

  const toggleFavourite = (cityName) => {
    const exists = favouriteCities.some(
      (city) => city.toLocaleLowerCase() === cityName.toLocaleLowerCase()
    );
    const nextCities = exists
      ? favouriteCities.filter(
          (city) => city.toLocaleLowerCase() !== cityName.toLocaleLowerCase()
        )
      : [...favouriteCities, cityName];

    setFavouriteCities(nextCities);
    try {
      window.localStorage.setItem(
        "weatherai.favoriteCities",
        JSON.stringify(nextCities)
      );
      setFavouriteError("");
    } catch (storageError) {
      console.error("Unable to save favourite cities.", storageError);
      setFavouriteError("Favourite cities could not be saved in this browser.");
    }
  };

  useEffect(() => {
    if (!weather || activeView !== "chatbot") return undefined;

    const controller = new AbortController();
    const { current, daily } = weather.data;

    const getAiInsight = async () => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content:
                  "You are a concise weather assistant. Give a brief, practical outlook and useful advice based only on the supplied weather data. Do not claim certainty beyond the forecast."
              },
              {
                role: "user",
                content: JSON.stringify({
                  city: weather.place.name,
                  country: weather.place.country,
                  timezone: weather.data.timezone,
                  current: {
                    temperatureC: current.temperature_2m,
                    feelsLikeC: current.apparent_temperature,
                    humidityPercent: current.relative_humidity_2m,
                    windSpeedKmh: current.wind_speed_10m,
                    precipitationMm: current.precipitation,
                    weatherCode: current.weather_code
                  },
                  today: {
                    highC: daily.temperature_2m_max[0],
                    lowC: daily.temperature_2m_min[0],
                    precipitationChancePercent:
                      daily.precipitation_probability_max[0]
                  }
                })
              }
            ]
          })
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "AI service request failed.");
        }

        if (typeof result.content !== "string" || !result.content.trim()) {
          throw new Error("AI service returned an empty response.");
        }

        setAiInsight(result.content);
      } catch (insightError) {
        if (insightError.name !== "AbortError") {
          setAiInsightError(insightError.message || "Unable to generate advice.");
        }
      } finally {
        if (!controller.signal.aborted) setAiInsightLoading(false);
      }
    };

    getAiInsight();
    return () => controller.abort();
  }, [activeView, weather]);

  useEffect(
    () => () => chatRequestControllerRef.current?.abort(),
    []
  );

  const sendChatMessage = async (event) => {
    event.preventDefault();
    const question = chatInput.trim();
    if (!weather || !question || chatLoading) return;

    const userMessage = { role: "user", content: question };
    const history = chatMessages.slice(-MAX_CHAT_HISTORY_MESSAGES);
    const controller = new AbortController();
    chatRequestControllerRef.current = controller;
    setChatMessages((messages) => [...messages, userMessage]);
    setChatInput("");
    setChatError("");
    setChatLoading(true);

    const { current, daily, hourly } = weather.data;
    const firstFutureHour = hourly.time.findIndex(
      (time) => time >= current.time
    );
    const hourlyStart = Math.max(0, firstFutureHour);
    const context = {
      city: weather.place.name,
      country: weather.place.country,
      timezone: weather.data.timezone,
      current: {
        time: current.time,
        temperatureC: current.temperature_2m,
        feelsLikeC: current.apparent_temperature,
        humidityPercent: current.relative_humidity_2m,
        windSpeedKmh: current.wind_speed_10m,
        precipitationMm: current.precipitation,
        conditions: weatherInfo(current.weather_code)[0]
      },
      next24Hours: hourly.time
        .slice(hourlyStart, hourlyStart + 24)
        .map((time, index) => {
          const forecastIndex = hourlyStart + index;
          return {
            time,
            temperatureC: hourly.temperature_2m[forecastIndex],
            rainChancePercent: hourly.precipitation_probability[forecastIndex],
            conditions: weatherInfo(hourly.weather_code[forecastIndex])[0]
          };
        }),
      sevenDayForecast: daily.time.map((day, index) => ({
        date: day,
        highC: daily.temperature_2m_max[index],
        lowC: daily.temperature_2m_min[index],
        rainChancePercent: daily.precipitation_probability_max[index],
        conditions: weatherInfo(daily.weather_code[index])[0]
      }))
    };

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are WeatherAI, a concise weather chatbot. Answer questions using only the supplied forecast for ${weather.place.name}. Use Celsius and the forecast's local dates and times. If the data does not answer a question, say so instead of guessing. Give practical clothing and outdoor suggestions based on temperature, rain, and wind. Current weather data: ${JSON.stringify(context)}`
            },
            ...history,
            userMessage
          ]
        })
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "AI service request failed.");
      }

      if (typeof result.content !== "string" || !result.content.trim()) {
        throw new Error("AI service returned an empty response.");
      }

      setChatMessages((messages) => [
        ...messages,
        { role: "assistant", content: result.content }
      ]);
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setChatError(requestError.message || "Unable to answer this question.");
      }
    } finally {
      if (!controller.signal.aborted) {
        chatRequestControllerRef.current = null;
        setChatLoading(false);
      }
    }
  };

  const suggestions = weather
    ? (() => {
        const current = weather.data.current;
        const temp = current.temperature_2m;
        const rain = weather.data.daily.precipitation_probability_max[0];
        const wind = current.wind_speed_10m;
        const clothingAdvice =
          temp >= 35
            ? "Wear loose, breathable clothing and a hat; avoid heavy layers."
            : temp >= 28
            ? "Choose light, breathable clothes and consider sun protection."
            : temp >= 18
            ? "Light layers should be comfortable; bring a thin layer for later."
            : temp >= 10
            ? "Wear warm layers and take a jacket for cooler periods."
            : "Dress warmly in insulated layers and cover exposed skin.";
        const activityAdvice =
          temp >= 35
            ? "It is very hot; avoid strenuous outdoor activity during the warmest hours."
            : temp >= 30
            ? "Plan outdoor activity for the cooler morning or evening hours."
            : temp <= 0
            ? "It is freezing; keep outdoor activities short and dress warmly."
            : temp <= 10
            ? "It is chilly; choose shorter outdoor plans and wear warm layers."
            : "The temperature is comfortable for most outdoor activities.";
        const weatherAdvice =
          temp >= 35
            ? "Take heat seriously: drink water, seek shade, and limit time in the sun."
            : temp >= 30
            ? "Stay hydrated and use sun protection in the warm weather."
            : temp <= 0
            ? "Protect yourself from the cold and watch for icy conditions."
            : temp <= 10
            ? "Keep warm, especially if you will be outside for a while."
            : "Conditions are mild; check the forecast again before heading out.";

        return [
          {
            icon: "👕",
            title: "Clothing",
            message: clothingAdvice
          },
          {
            icon: "🚶",
            title: "Outdoor Activities",
            message: `${activityAdvice} ${
              rain >= 60
                ? "Rain is likely, so consider indoor plans."
                : wind >= 35
                ? "Strong winds are possible; take care outdoors."
                : ""
            }`.trim()
          },
          {
            icon: "☀️",
            title: "Weather Advice",
            message: `${weatherAdvice} ${
              rain >= 50 ? "Carry an umbrella; rain is possible." : ""
            }`.trim()
          }
        ];
      })()
    : [];

  const current = weather?.data.current;
  const daily = weather?.data.daily;
  const hourly = weather?.data.hourly;
  const weatherTheme = current
    ? getWeatherTheme(current.weather_code, current.is_day === 1)
    : "theme-default";

  const todayHourly = hourly
    ? hourly.time
        .map((time, index) => ({
          time,
          temp: hourly.temperature_2m[index],
          code: hourly.weather_code[index],
          isDay: hourly.is_day[index] === 1,
          rainChance: hourly.precipitation_probability[index]
        }))
        .filter((item) => item.time >= current.time)
        .slice(0, 48)
        .filter((_, index) => index % 5 === 0)
    : [];

  const pageDetails =
    activeView === "favorites"
      ? ["Favourite Cities", "Your saved cities"]
      : activeView === "chatbot"
      ? ["AI Chatbot", "Ask questions about the selected city's weather"]
      : ["Weather Dashboard", "Your personal weather assistant"];
  const isCurrentCityFavourite = Boolean(
    weather?.place.name &&
      favouriteCities.some(
        (city) =>
          city.toLocaleLowerCase() ===
          weather.place.name.toLocaleLowerCase()
      )
  );

  return (
    <div className={`app ${weatherTheme}`}>
      <aside className="sidebar">
        <h2>☁ WeatherAI</h2>
        <p className="menu-title">MENU</p>
        <nav className="main-nav" aria-label="Main navigation">
          <button
            type="button"
            className={`menu ${activeView === "dashboard" ? "active" : ""}`}
            aria-current={activeView === "dashboard" ? "page" : undefined}
            onClick={() => changeView("dashboard")}
          >
            🌤️ Dashboard
          </button>
          <button
            type="button"
            className={`menu ${activeView === "favorites" ? "active" : ""}`}
            aria-current={activeView === "favorites" ? "page" : undefined}
            onClick={() => changeView("favorites")}
          >
            ⭐ Favourite Cities
          </button>
          <button
            type="button"
            className={`menu ${activeView === "chatbot" ? "active" : ""}`}
            aria-current={activeView === "chatbot" ? "page" : undefined}
            onClick={() => changeView("chatbot")}
          >
            🤖 AI Chatbot
          </button>
        </nav>
        <div className="sidebar-bottom">
          <p>WeatherAI</p>
          <small>Smart Weather Experience</small>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <h1>{pageDetails[0]}</h1>
            <p>{pageDetails[1]}</p>
          </div>

          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (search.trim()) {
                setShowRecentCities(false);
                changeView("dashboard");
                getWeather(search.trim());
              }
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setShowRecentCities(false);
              }
            }}
          >
            <div className="search-control">
              <input
                type="search"
                aria-label="Search for a city"
                aria-expanded={showRecentCities && recentCities.length > 0}
                aria-controls="recent-city-searches"
                autoComplete="off"
                value={search}
                onFocus={() => setShowRecentCities(true)}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowRecentCities(false);
                }}
                placeholder="Search for a city..."
              />
              {showRecentCities && recentCities.length > 0 && (
                <div
                  className="recent-searches"
                  id="recent-city-searches"
                  role="group"
                  aria-label="Recent searches"
                >
                  <p>Recent searches</p>
                  {recentCities.slice(0, MAX_RECENT_CITIES).map((city) => (
                    <button
                      type="button"
                      key={city}
                      onClick={() => selectCity(city)}
                    >
                      📍 {city}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="submit" disabled={loading}>
              {loading ? "Loading..." : "Search"}
            </button>
          </form>
        </header>

        {recentSearchError && (
          <p className="recent-search-warning" role="status">
            {recentSearchError}
          </p>
        )}
        {error && <div className="error" role="alert">{error}</div>}

        {loading && (
          <p className="message" role="status" aria-live="polite">
            {weather
              ? `Updating the forecast for ${weather.place.name}...`
              : "Loading weather data..."}
          </p>
        )}

        {!weather && !loading && activeView === "dashboard" && (
          <section className="panel city-page">
            <h2>Search weather by city</h2>
            <p className="empty-state">
              Enter a city above to see current conditions, forecasts, and
              personalized weather advice.
            </p>
          </section>
        )}

        {activeView === "dashboard" && weather && current && (
          <>
            <section className="current-weather">
              <div>
                <p className="location">
                  📍 {weather.place.name}
                  {weather.place.city &&
                    weather.place.city.toLocaleLowerCase() !==
                      weather.place.name.toLocaleLowerCase() &&
                    `, ${weather.place.city}`}
                  {weather.place.country && `, ${weather.place.country}`}
                </p>
                {Number.isFinite(weather.place.accuracy) && (
                  <p className="location-accuracy">
                    Device-reported location accuracy:{" "}
                    {formatLocationAccuracy(weather.place.accuracy)}
                  </p>
                )}
                <h2>{Math.round(current.temperature_2m)}°C</h2>
                <h3>
                  {weatherInfo(current.weather_code, current.is_day === 1)[0]}
                </h3>
                <p>
                  Feels like {Math.round(current.apparent_temperature)}°C
                </p>
                <p>{current.time.replace("T", " ")}</p>
                <button
                  type="button"
                  className="favorite-toggle"
                  aria-pressed={isCurrentCityFavourite}
                  onClick={() => toggleFavourite(weather.place.name)}
                >
                  {isCurrentCityFavourite
                    ? "★ Remove from favourites"
                    : "☆ Add to Favourite Cities"}
                </button>
              </div>
              <div className="sun-icon" aria-hidden="true">
                {weatherInfo(current.weather_code, current.is_day === 1)[1]}
              </div>
            </section>

            <section className="details">
              <div className="detail-card">
                <span>💧</span>
                <p>Humidity</p>
                <h3>{current.relative_humidity_2m}%</h3>
              </div>
              <div className="detail-card">
                <span>💨</span>
                <p>Wind Speed</p>
                <h3>{current.wind_speed_10m} km/h</h3>
              </div>
              <div className="detail-card">
                <span>🌧️</span>
                <p>Rain Chance</p>
                <h3>{daily.precipitation_probability_max[0]}%</h3>
              </div>
              <div className="detail-card">
                <span>🌡️</span>
                <p>Pressure</p>
                <h3>{current.surface_pressure} hPa</h3>
              </div>
            </section>

            <section className="content-grid forecast-grid">
              <div className="panel">
                <h2>Next 48 Hours</h2>
                <p className="forecast-note">
                  Temperature and rain chance every 5 hours
                </p>
                <div className="hourly">
                  {todayHourly.map((item) => (
                    <div className="hour-item" key={item.time}>
                      <p className="forecast-date">
                        {formatForecastDate(item.time)}
                      </p>
                      <p className="forecast-time">
                        {item.time.slice(11, 16)}
                      </p>
                      <span aria-hidden="true">
                        {weatherInfo(item.code, item.isDay)[1]}
                      </span>
                      <h3>{Math.round(item.temp)}°</h3>
                      <p className="rain-chance">{item.rainChance}% rain</p>
                    </div>
                  ))}
                </div>
              </div>

            </section>

            <section className="panel weekly-panel">
              <h2>7-Day Forecast</h2>
              {daily.time.map((day, index) => (
                <div className="week-item" key={day}>
                  <p>
                    {new Date(day + "T12:00:00").toLocaleDateString(
                      "en",
                      { weekday: "long" }
                    )}
                  </p>
                  <span>{weatherInfo(daily.weather_code[index])[1]}</span>
                  <b>
                    {Math.round(daily.temperature_2m_max[index])}° /
                    {Math.round(daily.temperature_2m_min[index])}°
                  </b>
                </div>
              ))}
            </section>
          </>
        )}

        {activeView === "favorites" && (
          <section className="panel city-page">
            <h2>⭐ Favourite Cities</h2>
            <p className="page-description">
              Save a city from its dashboard to keep it in this list.
            </p>
            {favouriteError && (
              <p className="recent-search-warning" role="alert">
                {favouriteError}
              </p>
            )}
            {favouriteCities.length > 0 ? (
              <div className="city-list">
                {favouriteCities.map((city) => (
                  <div className="city-row" key={city}>
                    <button
                      type="button"
                      className="city-row-name"
                      onClick={() => selectCity(city)}
                    >
                      ⭐ {city}
                    </button>
                    <button
                      type="button"
                      className="remove-favourite"
                      onClick={() => toggleFavourite(city)}
                      aria-label={`Remove ${city} from favourite cities`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">
                No favourite cities yet. Search for a city and add it from the
                dashboard.
              </p>
            )}
          </section>
        )}

        {activeView === "chatbot" &&
          (weather ? (
            <WeatherAssistantPanel
              weather={weather}
              suggestions={suggestions}
              aiInsight={aiInsight}
              aiInsightLoading={aiInsightLoading}
              aiInsightError={aiInsightError}
              chatMessages={chatMessages}
              chatInput={chatInput}
              chatLoading={chatLoading}
              chatError={chatError}
              onChatInputChange={setChatInput}
              onChatSubmit={sendChatMessage}
            />
          ) : (
            <section className="panel city-page">
              <h2>🤖 AI Chatbot</h2>
              <p className="empty-state">
                Search for a city first, then ask the chatbot about its weather.
              </p>
            </section>
          ))}

        {favouriteError && activeView !== "favorites" && (
          <p className="recent-search-warning" role="alert">
            {favouriteError}
          </p>
        )}

        <footer>WeatherAI © 2026 | Weather data: Open-Meteo</footer>
      </main>
    </div>
  );
}

export default App;
