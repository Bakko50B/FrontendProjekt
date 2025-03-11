"use strict";

const weatherApiKey = "ab24c48f709da6ffa8ed82d1df50a76c";   // OpenWeather API Key
const placesApiKey = "798f5d6af0604b7da65c777059f5618d";    // Geoapify API Key

const myNearmeButtonEl = document.getElementById("myLocation");
myNearmeButtonEl.addEventListener('click', findMyLocation);

// Lyssna efter ENTER-tangent i sökfältet
const MySearchEl = document.getElementById("search-box");


MySearchEl.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        searchLocation();
    }
});


const myPlaceToSearchButtonEl = document.getElementById("placeToSearch");
myPlaceToSearchButtonEl.disabled = MySearchEl.value.trim() === "";
myPlaceToSearchButtonEl.addEventListener('click', searchLocation);

MySearchEl.addEventListener("input", function () {
    myPlaceToSearchButtonEl.disabled = !MySearchEl.value.trim();

});
/**
let myMap = document.getElementById("map");

const map = L.map('map').setView([59.3293, 18.0686], 4); // Sverige

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors' 
}).addTo(map);
*/

/** Jag fick aldrig till rättigheterna på mitt weather api konto
 * Lagerhanteringen fungerar men det visas typ inget väder bara en del tomma bilder 
 */

// Skapa Leaflet-kartan och sätt standardvy
const map = L.map('map').setView([59.3293, 18.0686], 4); // Sverige

// Baslager (standardkartan)
const baseLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
});

// Väderlager
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

// Funktion för att hämta väderdata
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

// Funktion för att hämta sevärdheter
async function getNearbyPlaces(lat, lon) {
    // Dynamiskt hämta valda kategorier från checkboxarna
    const checkboxes = document.querySelectorAll("#search-container input[type='checkbox']:checked");
    const categories = Array.from(checkboxes).map(checkbox => checkbox.id); // Hämta ID:n för markerade checkboxar

    if (categories.length === 0) {
        return "Välj minst en kategori att visa!";
    }

    let categoriesString = categories.join(","); // Skapa kommaseparerad sträng av kategorier
    console.log(categoriesString);

    const radius = 10000; // 10 km radie
    const url = `https://api.geoapify.com/v2/places?categories=${categoriesString}&filter=circle:${lon},${lat},${radius}&bias=proximity:${lon},${lat}&lang=sv&limit=10&apiKey=${placesApiKey}`;
    //console.log(url); 

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
                        autoPanPadding: [20, 20], // Marginal runt popupen
                        maxWidth: 300 // Begränsa bredden på popupen
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

// Kombinerad funktion för att visa både väder och sevärdheter
async function showInfo(lat, lon) {

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
        offset: [0, -20] // Flytta popupen uppåt
    })
        .setLatLng([lat, lon])
        .setContent(popupContent)
        .openOn(map);
}


function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
    });
}

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
                autoPanPadding: [20, 20],
                maxWidth: 300
            })
            .openPopup();

        // Använd `flyTo` för smidig animering
        map.flyTo([lat, lon], 11, { duration: 2 });

        // Visa väder och sevärdheter
        await showInfo(lat, lon);
    } catch (error) {
        console.error("Ett fel uppstod när platsen hämtades:", error);
        alert("Kunde inte hämta din plats. Försök igen.");
    }
}






// Hämta väder och sevärdheter via sökfältet
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



// Uppdaterad travelToLocation som inkluderar showInfo
async function travelToLocation(lat, lon) {
    try {
        map.closePopup(); // Stäng popup innan resan startar
        await map.flyTo(map.getCenter(), 3, { easeLinearity: 0.1 }); // Zooma ut

        await map.flyTo([lat, lon], 3, { easeLinearity: 0.1 }); // Flyg till destinationen

        await map.flyTo([lat, lon], 13, { easeLinearity: 0.1 }); // Zooma in

        userMarkerLayer.clearLayers(); // Rensa tidigare markörer
        L.marker([lat, lon])
            .addTo(userMarkerLayer)
            .bindPopup("<b>Den här platsen hittades!</b>", {
                autoPan: true,
                autoPanPadding: [20, 20],
                maxWidth: 300
            })
            .openPopup();


        // Säkerställ att väder och sevärdheter visas
        await showInfo(lat, lon);
    } catch (error) {
        console.error("Ett fel uppstod under resan:", error);
        alert("Kunde inte slutföra resan. Försök igen.");
    }
}



// Visa väder och sevärdheter vid kartklick
map.on('click', function (e) {
    const lat = e.latlng.lat; // Hämta latitud från klickhändelsen
    const lon = e.latlng.lng; // Hämta longitud från klickhändelsen

    const currentZoom = map.getZoom(); // Hämta nuvarande zoomnivå
    const targetZoom = Math.max(currentZoom, 10); // Definiera målzoomnivån (minst 10)

    // Använd 'flyTo' för att animera kartan till den klickade platsen
    map.flyTo([lat, lon], targetZoom, {
        duration: 2 // Animationens längd i sekunder
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

