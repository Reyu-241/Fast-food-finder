const STORAGE = {
    restaurants: 'fastFood_restaurants',
    location: 'fastFood_location',
    timestamp: 'fastFood_timestamp'
};

let userLat, userLon, allRestaurants = [];
let map, userMarker, restaurantMarkers = [];

const $ = id => document.getElementById(id);

const saveCache = (key, data) => {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch(e) {}
};

const loadCache = key => {
    try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; }
};

const distance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const displayLocation = (lat, lon, isCached = false) => {
    userLat = lat;
    userLon = lon;
    const cached = isCached ? ' (Cached)' : '';
    $('coordsDisplay').innerHTML = `📍 <strong>Your Location${cached}:</strong><br>Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}`;
    $('filterSection').style.display = 'block';
};

const initMap = () => {
    map = L.map('map').setView([-25.06, 27.11], 13); // default view

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
    }).addTo(map);
};

const clearMarkers = () => {
    restaurantMarkers.forEach(marker => map.removeLayer(marker));
    restaurantMarkers = [];
    if (userMarker) map.removeLayer(userMarker);
};

const addMarkers = (restaurants) => {
    clearMarkers();

    // User location marker
    userMarker = L.marker([userLat, userLon], {
        icon: L.divIcon({ className: 'user-location', html: '📍', iconSize: [30, 30] })
    }).addTo(map).bindPopup("You are here");

    // Restaurant markers
    restaurants.forEach(place => {
        const marker = L.marker([place.lat, place.lon])
            .addTo(map)
            .bindPopup(`
                <strong>${place.name}</strong><br>
                ${place.cuisine}<br>
                ${place.distance.toFixed(2)} km
            `);

        marker.on('click', () => displayPlaceDetails(place));
        restaurantMarkers.push(marker);
    });
};

const loadCachedData = () => {
    const cached = loadCache(STORAGE.restaurants);
    const location = loadCache(STORAGE.location);
    
    if (cached && location) {
        displayLocation(location.lat, location.lon, true);
        allRestaurants = cached;
        renderRestaurants(allRestaurants);
        if (map) addMarkers(allRestaurants);
    }
};

const showError = (message) => {
    $('loadingSpinner').style.display = 'none';
    $('restaurantsList').innerHTML = `<li class="restaurant-item" style="color:red;">❌ ${message}</li>`;
};

const fetchFastFood = async (lat, lon) => {
    $('loadingSpinner').style.display = 'block';
    $('restaurantsList').innerHTML = '<li class="restaurant-item">🔍 Searching nearby...</li>';

    const radius = 12000; // 12km
    const query = `
[out:json][timeout:30];
(
  node["amenity"="fast_food"](around:${radius},${lat},${lon});
  way["amenity"="fast_food"](around:${radius},${lat},${lon});
);
out center;
`;

    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (!response.ok) throw new Error('Overpass API error');

        const data = await response.json();

        if (!data.elements?.length) {
            showError('No fast food places found nearby.');
            allRestaurants = [];
            return;
        }

        allRestaurants = data.elements.map((el, index) => {
            const tags = el.tags || {};
            const center = el.center || el;
            const name = tags.name || 'Fast Food Place';
            const cuisine = tags.cuisine ? tags.cuisine.split(';').join(', ') : 'Fast Food';

            let address = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
            if (!address) address = 'Address unavailable';

            return {
                name,
                cuisine,
                address,
                phone: tags.phone || '',
                website: tags.website || '',
                hours: tags.opening_hours || '',
                lat: parseFloat(center.lat),
                lon: parseFloat(center.lon),
                distance: distance(lat, lon, parseFloat(center.lat), parseFloat(center.lon)),
                id: index + 1
            };
        });

        allRestaurants.sort((a, b) => a.distance - b.distance);

        saveCache(STORAGE.restaurants, allRestaurants);
        saveCache(STORAGE.location, { lat, lon });
        saveCache(STORAGE.timestamp, new Date().toISOString());

        renderRestaurants(allRestaurants);
        addMarkers(allRestaurants);

    } catch (err) {
        console.error(err);
        showError('Failed to fetch data from Overpass API. Try again later.');
    } finally {
        $('loadingSpinner').style.display = 'none';
    }
};

const renderRestaurants = (restaurants) => {
    const maxDist = parseFloat($('distanceFilter').value) || 5;
    const filtered = restaurants.filter(r => r.distance <= maxDist);

    const list = $('restaurantsList');
    if (filtered.length === 0) {
        list.innerHTML = '<li class="restaurant-item">No restaurants within selected distance.</li>';
        return;
    }

    list.innerHTML = filtered.map(place => `
        <li class="restaurant-item" data-id="${place.id}">
            <div class="restaurant-header">
                <strong>${place.name}</strong>
                <span class="distance-badge">${place.distance.toFixed(2)} km</span>
            </div>
            <small>${place.cuisine}</small><br>
            <small class="address">📍 ${place.address}</small>
        </li>
    `).join('');

    // Click handlers
    document.querySelectorAll('.restaurant-item').forEach(li => {
        li.addEventListener('click', () => {
            const place = restaurants.find(r => r.id == li.dataset.id);
            if (place) {
                displayPlaceDetails(place);
                map.flyTo([place.lat, place.lon], 16);
            }
        });
    });
};

const displayPlaceDetails = (place) => {
    $('detailName').textContent = place.name;
    $('detailCuisine').textContent = place.cuisine;
    $('detailAddress').textContent = place.address;
    $('detailDistance').textContent = `${place.distance.toFixed(2)} km away`;
    
    $('detailLinks').innerHTML = `
        <a href="https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}" target="_blank" class="link-btn">🗺️ OSM</a>
        <a href="https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}" target="_blank" class="link-btn">Google Maps</a>
        ${place.website ? `<a href="${place.website}" target="_blank" class="link-btn">🌐 Website</a>` : ''}
    `;

    $('detailExtra').innerHTML = place.phone 
        ? `📞 ${place.phone}<br>${place.hours ? `⏰ ${place.hours}` : ''}`
        : 'No extra info';

    $('selectedPlaceDetails').style.display = 'block';
};

const clearSelection = () => {
    $('selectedPlaceDetails').style.display = 'none';
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadCachedData();

    $('getLocationBtn').addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert("Geolocation not supported");
            return;
        }

        $('loadingSpinner').style.display = 'block';

        navigator.geolocation.getCurrentPosition(
            pos => {
                const { latitude, longitude } = pos.coords;
                displayLocation(latitude, longitude);
                map.flyTo([latitude, longitude], 14);
                fetchFastFood(latitude, longitude);
            },
            err => {
                console.warn(err);
                alert("Could not get location. Using fallback (Johannesburg area).");
                displayLocation(-25.06, 27.11);
                map.flyTo([-25.06, 27.11], 14);
                fetchFastFood(-25.06, 27.11);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });

    $('distanceFilter').addEventListener('input', () => {
        $('distanceValue').textContent = $('distanceFilter').value + ' km';
        renderRestaurants(allRestaurants);
    });

    $('clearButton').addEventListener('click', clearSelection);
});