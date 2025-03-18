"use strict";

const weatherApiKey = "ab24c48f709da6ffa8ed82d1df50a76c";   // OpenWeather API Key
const placesApiKey = "798f5d6af0604b7da65c777059f5618d";    // Geoapify API Key

const myNearmeButtonEl = document.getElementById("myLocation");
myNearmeButtonEl.addEventListener('click', findMyLocation);


const MySearchEl = document.getElementById("search-box");

// Lyssna efter ENTER-tangent i sökfältet
MySearchEl.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        searchLocation();
    }
});


const myPlaceToSearchButtonEl = document.getElementById("placeToSearch");
//tomt även om det finns mellanslag i den
myPlaceToSearchButtonEl.disabled = MySearchEl.value.trim() === "";
myPlaceToSearchButtonEl.addEventListener('click', searchLocation);

// lyssnar om det finns innehåll i sökrutan. Om det inte finns innehåll i sökrutan är knappen disabled
MySearchEl.addEventListener("input", function () {
    myPlaceToSearchButtonEl.disabled = !MySearchEl.value.trim();
});

// Skapa Leaflet-kartan och sätt standardvy
const map = L.map('map').setView([59.3293, 18.0686], 4); // Sverige

// Baslager (standardkartan)
const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
});

// Väderlager (4st olika)
const windLayer = L.tileLayer(`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${weatherApiKey}`, {
    attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
});

const tempLayer = L.tileLayer(`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${weatherApiKey}`, {
    attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
});

const rainLayer = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${weatherApiKey}`, {
    attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
});

const cloudsLayer = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${weatherApiKey}`, {
    attribution: '&copy; <a href="https://openweathermap.org/">OpenWeatherMap</a>'
});

// Lägg till standardlagret som startlager på kartan
map.addLayer(baseLayer); // Viktigt: Baslager läggs till här

// Skapa lagerkontroll för att växla mellan lager
L.control.layers(
    { "Standardkarta": baseLayer },  // Baslager (bara ett aktivt åt gången)
    {
        "Vind": windLayer,
        "Temperatur": tempLayer,
        "Nederbörd": rainLayer,
        "Molntäcke": cloudsLayer
    }  // Överlagringslager (flera kan vara aktiva samtidigt)
).addTo(map);

let userMarkerLayer = L.layerGroup().addTo(map);    // Lager för användarens markör
let attractionsLayer = L.layerGroup().addTo(map);   // Lager för sevärdhetsmarkörer

/**
 * Hämtar väderdata för en given position
 *
 * @async
 * @function getWeather
 * @param {number} lat - Latitude of the location.
 * @param {number} lon - Longitude of the location.
 * @returns {Promise<string>} A string containing the weather description, temperature, and an icon image HTML, or an error message if the request fails.
 * 
 * @throws {Error} If the API response is not OK (e.g., network issue or bad status code).
 *
 * @example
 * const weatherHtml = await getWeather(59.3293, 18.0686); // Stockholm, Sverige
 * console.log(weatherHtml);
 */
async function getWeather(lat, lon) {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=sv&appid=${weatherApiKey}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const data = await response.json();
        const description = data.weather[0].description;
        const temp = data.main.temp;
        const iconCode = data.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
        return `Väder: ${description} <br> Temp: ${temp}°C <br> <img src="${iconUrl}" alt="${description}">`;
    } catch (error) {
        return "Kunde inte hämta väderdata.";
    }
}

/**
 * Hämtar platser i "närheten" baserat på kategori och plats- Visar innehållet på kartan
 *
 * @async
 * @function getNearbyPlaces
 * @param {number} lat - Latitude på användarens location.
 * @param {number} lon - Longitude på användarens location.
 * @returns {Promise<string>} En string innehåller HTML med listor på platser med länkar, 
 * Eller ett felmeddelande om något går fel.
 *
 * @throws {Error} Om fel
 */
async function getNearbyPlaces(lat, lon) {
    // Dynamiskt hämta valda kategorier från checkboxarna
    const checkboxes = document.querySelectorAll("#search-container input[type='checkbox']:checked");
    const categories = Array.from(checkboxes).map(checkbox => checkbox.id); // Hämta ID:n för markerade checkboxar

    if (categories.length === 0) {
        return "Välj minst en kategori att visa!";
    }

    let categoriesString = categories.join(","); // Skapa kommaseparerad sträng av kategorier
    //console.log(categoriesString);

    const radius = 10000; // 10 km radie
    const url = `https://api.geoapify.com/v2/places?categories=${categoriesString}&filter=circle:${lon},${lat},${radius}&bias=proximity:${lon},${lat}&lang=sv&limit=20&apiKey=${placesApiKey}`;
    
    try {
        attractionsLayer.clearLayers(); // Rensa tidigare sevärdhetsmarkörer
        const response = await fetch(url);
        const data = await response.json();
        if (data.features.length === 0) return "Inget resultat på din plats!";

        let placesInfo = "<b>Resulatet:</b><ul>";

        data.features.forEach(place => {
            if (place.properties.name) {
                let name = place.properties.name;
                let placeLat = place.geometry.coordinates[1];
                let placeLon = place.geometry.coordinates[0];
                let city = place.properties.city || "";
                let googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(name + ' ' + city)}`;

                // Lägg till markör för sevärdheten
                L.marker([placeLat, placeLon])
                    .addTo(attractionsLayer)
                    .bindPopup(`<b>${name}</b>`, {
                        autoPan: true, // Flytta kartan om popup hamnar utanför vyn
                        autoPanPadding: [2, 2], 
                        keepInView: true
                    })
                    .openPopup();

                placesInfo += `<li><a href="${googleSearchUrl}" target="_blank">${name}</a></li>`;
            }
        });
        placesInfo += "</ul>";
        return placesInfo;
    } catch (error) {
        console.error("Ett fel uppstod vid API-anropet:", error);
        return "Kunde inte hämta sevärdheter.";
    }
}

/**
 * Funktion för att visa både väder och platser på en karta.
 *
 * @async
 * @function showInfo
 * @param {number} lat - Latitud.
 * @param {number} lon - Longitud.
 * @returns {Promise<void>} Uppdaterarkartan och DOM.
 *
 * @description
 * Hämtar väderdata och platser i närheten baserat på latitude och longitude.
 * Visar informationen i en Leaflet popup.
 *
 * @example
 * await showInfo(59.3293, 18.0686); // Visar info för Stockholm, Sverige
 */
async function showInfo(lat, lon) {

    fetchWeather(lat, lon);
    const popup = document.getElementById('weatherPopup');
    const toggleButton = document.getElementById('toggleForecast'); // Knappen med väder

    if (popup.style.display === 'block') {
        popup.style.display = 'none'; 
        toggleButton.textContent = 'Visa prognos'; // Uppdatera knappens text
    }

    // Hämta väderdata och sevärdheter
    const weatherInfo = await getWeather(lat, lon);
    const placesInfo = await getNearbyPlaces(lat, lon);

    // Skapa popup-innehåll
    const popupContent = `
        <b>Plats:</b> (${lat.toFixed(2)}, ${lon.toFixed(2)})<br>
        ${weatherInfo}<hr>
        ${placesInfo}`;

    // Skapa och öppna popup på kartan
    L.popup({
        autoPan: true,              // Gör att kartan automatiskt panorerar för att visa popupen
        autoPanPadding: [2, 20],    // Marginal från kartkanten (20 pixlar horisontellt och vertikalt)
        keepInView: true,           // Se till att popupen alltid håller sig inom kartans vy
        offset: [0, -20 ] 
    })
        .setLatLng([lat, lon])
        .setContent(popupContent)
        .openOn(map);
}

/**
 * Hämtar webbläsarens nuvarande position
 *
 * @function getCurrentLocation
 * @returns {Promise<GeolocationPosition>} Ett Promise som resolves med användarens position, 
 * eller rejects med ett error om location access misslyckas.
 */
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
}

/**
 * Sätter användarens nuvarande position på kartan med väder och intressepunkter i en popup
 *
 * @async
 * @function findMyLocation
 * @returns {Promise<void>} Uppdaterar kartan och DOM
 *
 * @description
 * Använder Geolocation för positionering.
 * Hanterar fel om det behövs 
 * @throws {Error} Kastar ett fel vid fel.
 *
 * @example
 * await findMyLocation(); // Hämtar och visar användarens position på kartan
 */
async function findMyLocation() {
    if (!navigator.geolocation) {
        alert("Din webbläsare stöder inte platstjänster.");
        return;
    }

    try {
        const position = await getCurrentLocation();
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        userMarkerLayer.clearLayers(); // Rensa tidigare markör

        // Lägg till en markör för användarens position
        L.marker([lat, lon])
            .addTo(userMarkerLayer)
            .bindPopup("<b>Du är här!</b>", {
                autoPan: true,
                autoPanPadding: [20, 50 ],
                maxWidth: 300
            })
            .openPopup();

        // Använder `flyTo` för smidig animering 
        map.flyTo([lat, lon], 14, { duration: 5 });

        await showInfo(lat, lon);
    } catch (error) {
        console.error("Ett fel uppstod när platsen hämtades:", error);
        alert("Kunde inte hämta din plats. Försök igen.");
    }
}


/**
 * Söker efter en plats baserat på användarens sökfråga och uppdaterar kartan med resultatet.
 *
 * @async
 * @function searchLocation
 * @returns {Promise<void>} Returnerar inget värde, men uppdaterar kartan och visar sökresultatet.
 *
 * @description
 * Funktionen hämtar användarens sökfråga. 
 * Den skickar en förfrågan för att hitta matchande platser och uppdaterar kartan.
 * Om ingen plats hittas eller ett fel uppstår får användaren en varning.
 *
 * @throws {Error} Kastar ett fel om API-anropet misslyckas eller om svarskoden inte är OK.
 *
 * @example
 * // Utför en sökning när användaren anger "Stockholm" i inmatningsfältet
 * await searchLocation();
 */
async function searchLocation() {
    try {
        let query = document.getElementById('search-box').value.trim();
        if (!query) {
            alert("Ange en stad eller ort");
            return;
        }

        userMarkerLayer.clearLayers();
        attractionsLayer.clearLayers();

        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}`;

        // Hämta platsdata
        const response = await fetch(url);
        if (!response.ok) throw new Error(`API-fel: ${response.status}`);

        const data = await response.json();
        if (data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);

            // Anropa funktionen för att skapa "flygresa" till platsen
            await travelToLocation(lat, lon);
        } else {
            alert(`Platsen "${query}" hittades inte.`);
        }
    } catch (error) {
        console.error("Ett fel uppstod vid sökning:", error);
        alert("Kunde inte söka platsen. Kontrollera din anslutning och försök igen.");
    }
}

/**
 * Reser till en given plats genom att animera kartan och uppdatera den med en markör.
 *
 * @async
 * @function travelToLocation
 * @param {number} lat - Latituden för destinationen.
 * @param {number} lon - Longituden för destinationen.
 * @returns {Promise<void>} Returnerar inget värde, men uppdaterar kartan och visar information.
 *
 * @description
 * Funktionen animerar kartan genom att först zooma ut, sedan "flyga" till den angivna platsen och 
 * zooma in på destinationen. Tidigare markörer rensas, och en ny markör placeras vid destinationen 
 * med en popup. Funktionalitet för att visa väder och sevärdheter på destinationen anropas också.
 *
 * @throws {Error} Kastar ett fel om kartresan misslyckas eller om något annat fel uppstår.
 *
 * @example
 * // Res till Stockholm (latitud 59.3293, longitud 18.0686)
 * await travelToLocation(59.3293, 18.0686);
 */
async function travelToLocation(lat, lon) {
    try {
        map.closePopup(); // Stäng popup innan resan startar
        map.flyTo([lat, lon], 14, { duration: 10, easeLinearity: .8 });

        userMarkerLayer.clearLayers(); // Rensa tidigare markörer
        L.marker([lat, lon])
            .addTo(userMarkerLayer)
            .bindPopup("<b>Den här platsen hittades!</b>", {
                autoPan: true,
                autoPanPadding: [20, 20],
                maxWidth: 300
            })
            .openPopup();
        await showInfo(lat, lon);
    } catch (error) {
        console.error("Ett fel uppstod under resan:", error);
        alert("Kunde inte slutföra resan. Försök igen.");
    }
}

/**
 * Hanterar klickhändelser på kartan genom att flytta kartan, placera en markör och visa information.
 *
 * @function
 * @param {Object} e - Klickhändelse som innehåller information om den klickade platsen, inklusive latitud och longitud.
 *
 * @description
 * När användaren klickar på kartan:
 * - Hämtar latitud och longitud från händelsen.
 * - Flyttar och animerar kartan till den klickade platsen.
 * - Rensar tidigare användarmarkörer och lägger till en ny markör vid den klickade platsen.
 * - Visar en popup som säger "Du klickade här!" på den nya markören.
 * - Anropar `showInfo`-funktionen för att visa väderdata och sevärdheter för den klickade platsen.
 *
 * @example
 * map.on('click', function (e) {
 *     // Hanterar klickhändelser
 * });
 */
map.on('click', function (e) {

    const lat = e.latlng.lat; // Hämta latitud från klickhändelsen
    const lon = e.latlng.lng; // Hämta longitud från klickhändelsen

    const currentZoom = map.getZoom(); // Hämta nuvarande zoomnivå
    const targetZoom = Math.max(currentZoom, 10); // Definiera målzoomnivån (minst 10)

    // Använd 'flyTo' för att animera kartan till den klickade platsen
    map.flyTo([lat, lon], targetZoom, {
        duration: 5 // Animationens längd i sekunder
    });

    // Rensa tidigare användarmarkörer
    userMarkerLayer.clearLayers();

    // Lägg till markör på den klickade platsen
    L.marker([lat, lon])
        .addTo(userMarkerLayer)
        .bindPopup("<b>Du klickade här!</b>", {
            autoPan: true,
            autoPanPadding: [20, 20],
            maxWidth: 300
        })
        .openPopup();

    // Visa väder och sevärdheter för den klickade platsen
    showInfo(lat, lon);
});

// Variabel för att spara senaste hämtade väderdata
let lastFetchedWeather = null;


/**
 * Hanterar klickhändelsen på knappen för att visa eller dölja väderpopupen.
 *
 */
document.getElementById('toggleForecast').addEventListener('click', () => {
    const popup = document.getElementById('weatherPopup');

    if (!lastFetchedWeather) {
        alert('Ingen väderdata finns ännu. Visa plats först!');
        return; 
    }

    if (popup.style.display === 'block') {
        popup.style.display = 'none';
        document.getElementById('toggleForecast').textContent = 'Visa väder';
    } else {
        showPopup(lastFetchedWeather);
    }
});

/**
 * Hanterar klickhändelsen på knappen för att stänga väderpopupen.
 *
 */
document.getElementById('closePopup').addEventListener('click', () => {
    document.getElementById('weatherPopup').style.display = 'none';
    document.getElementById('toggleForecast').textContent = 'Visa väder';
});

/**
 * Hämtar väderprognosdata från MET.no baserat på angiven latitud och longitud.
 *
 * @async
 * @function fetchWeather
 * @param {number} lat - Latitud för platsen.
 * @param {number} lon - Longitud för platsen.
 * @returns {Promise<void>} Returnerar inget, men sparar den hämtade väderprognosen i `lastFetchedWeather`.
 *
 * @description
 * Funktionen hämtar väderdata från MET.no:s LocationForecast API. 
 * Vid framgång genereras popup-innehåll baserat på tidsseriedata.
 * Om ett fel uppstår loggas det till konsolen.
 *
 * @throws {Error} Kastar ett fel om HTTP-förfrågan misslyckas eller om API-svaret inte är OK.
 *
 * @example
 * await fetchWeather(59.3293, 18.0686); // Hämta väderdata för Stockholm
 */
async function fetchWeather(lat, lon) {
    
    const apiUrl = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'MinApp/1.0 (tolu2403@student.miun.se)'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP-fel! Status: ${response.status}`);
        }
        const data = await response.json();

        // Generera innehåll för popupen
        const forecastContent = generateForecastContent(data.properties.timeseries);
        lastFetchedWeather = forecastContent; // Spara väderdatan för visning

    } catch (error) {
        console.error('Något gick fel:', error);
    }
}

/**
 * Visar popup-fönstret med väderinformation och uppdaterar dess innehåll.
 *
 * @function showPopup
 * @param {string} content - HTML-innehållet som ska visas i popupen.
 *
 * @description
 * Funktionen uppdaterar popupen för väderinformation och visar den för användaren.
 * 
 */
function showPopup(content) {
    const popup = document.getElementById('weatherPopup');
    const popupContent = document.getElementById('popupContent');
    popupContent.innerHTML = content;
    popup.style.display = 'block';
    document.getElementById('toggleForecast').textContent = 'Dölj prognos'; // Ändra knappens text
}

/**
 * Object för att hantera symboler efter symbolkod
 * Varje vädersymbolkoder ger en "emoji" 
 */
const symbolCodeMap = {
    "clearsky_day": "☀️",
    "clearsky_night": "🌙",
    "cloudy": "☁️",
    "fair_day": "🌤️",
    "fair_night": "🌛",
    "fog": "🌫️",
    "heavysleet": "❄️💦",
    "partlycloudy_day": "⛅",
    "partlycloudy_night": "🌛☁️",
    "rain": "🌧️",
    "lightrain": "🌦️",
    "lightrainshowers_day": "☔",
    "heavyrain": "🌧️🌧️",
    "heavyrainshowers_day": "🌧️🌧️",
    "rainshowers_day": "🌦️",
    "heavyrainshowers_night": "🌧️🌙",
    "lightrainshowers_night": "🌜💧",
    "snow": "❄️",
    "snowshowers_night": "🌨️🌙",
    "lightsnow": "🌨️",
    "lightsnowshowers_day": "🌨️",
    "lightsnowshowers_night": "🌨️🌙",
    "heavysnow": "❄️❄️",
    "thunderstorm": "⛈️ ",
    "lightsleet": "🌨️💧",
    "sleet": "🌨️💧"
};


/**
 * Genererar HTML-innehåll för en 12-timmars väderprognos baserat på en tidsserie.
 *
 * @function generateForecastContent
 * @param {Array} timeseries - En array med väderdata där varje objekt innehåller detaljer om vädret per timme.
 * @returns {string} En HTML-sträng som representerar väderprognosens innehåll.
 *
 * @description
 * Funktionen tar en tidsserie med väderdata, loopar igenom de första 12 timmarna och genererar en HTML-struktur
 * För varje timme inkluderas:
 * - En tidsbeskrivning ("Nu" för den första timmen, "+ Xh" för efterföljande timmar).
 * - En emoji för väderförhållandet hämtad från `symbolCodeMap`.
 * - Temperaturen och vindhastigheten för timmen.
 * Om en vädersymbol saknas i `symbolCodeMap` används en standardikon (❓).
 * 
 */
function generateForecastContent(timeseries) {

    let content = '<h2>12h prognos</h2><p>Från Yr.nu</p>';
    let hourCounter = 0; // Räknare för timmar

    timeseries.slice(0, 12).forEach(entry => {
        const symbolCode = entry.data.next_1_hours?.summary.symbol_code || "unknown"; // Hämta symbol_code
        const symbol = symbolCodeMap[symbolCode] || "❓"; // Hämta ikon från map, standardvärde om koden saknas

        //console.log(symbolCode); // Jobbat med att hitta alla olika symbolkoder
        let timeLabel = hourCounter === 0 ? "Nu: &nbsp;&nbsp;" : `+ ${hourCounter}h:`;

        content += `
            <div class="weatherrow">
                <p><span class="weather">${timeLabel}</span> 
                <span class="symbol">${symbol}</span> 
                <span class="temp">Temp: ${entry.data.instant.details.air_temperature}°C </span>
                Vind: ${entry.data.instant.details.wind_speed} m/s</p>
            </div>
        `;
        hourCounter++; 
    });

    return content;
}