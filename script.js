const STORAGE = {
    restaurants: 'fastFood_restaurants',
    location: 'fastFood_location',
    timestamp: 'fastFood_timestamp'
};

let userLat, userLon, allRestaurants = [];

const $ = id => document.getElementById(id);

const saveCache = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn('Cache save failed:', e);
    }
};

const loadCache = key => {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch (e) {
        return null;
    }
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
    const time = isCached ? `<br><small style="color:#999;">Cached</small>` : '';
    $('coordsDisplay').innerHTML = 
        `📍 <strong>Your Location${cached}:</strong><br>Latitude: ${lat.toFixed(5)}, Longitude: ${lon.toFixed(5)}${time}`;
    $('filterSection').style.display = 'block';
};

const loadCachedData = () => {
    const cached = loadCache(STORAGE.restaurants);
    const location = loadCache(STORAGE.location);
    
    if (cached && location) {
        displayLocation(location.lat, location.lon, true);
        allRestaurants = cached;
        renderRestaurants(allRestaurants);
    }
};

const showError = (message) => {
    console.error('Error:', message);
    $('loadingSpinner').style.display = 'none';
    $('restaurantsList').innerHTML = `
        <li class="restaurant-item" style="color:red;">
            <strong>❌ Error:</strong> ${message}<br>
            <small>Check the console for details (Press F12)</small>
        </li>`;
};

const fetchFastFood = async (lat, lon) => {
    $('loadingSpinner').style.display = 'block';
    $('restaurantsList').innerHTML = '<li class="restaurant-item">🔍 Searching nearby fast food places...</li>';
    
    console.log(`Fetching fast food near: ${lat}, ${lon}`);

    const radius = 10000; // 10km
    const query = `
[out:json][timeout:25];
(
  node["amenity"="fast_food"](around:${radius},${lat},${lon});
  way["amenity"="fast_food"](around:${radius},${lat},${lon});
  relation["amenity"="fast_food"](around:${radius},${lat},${lon});
);
out center;
`;

    const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.private.coffee/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter'
    ];

    let success = false;

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: `data=${encodeURIComponent(query)}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'FastFood-Locator-App'
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();

            if (data.elements && data.elements.length > 0) {
                allRestaurants = data.elements.map((el, index) => {
                    const tags = el.tags || {};
                    const center = el.center || el;
                    
                    const name = tags.name || 'Unnamed Fast Food';
                    const cuisine = tags.cuisine 
                        ? tags.cuisine.split(';').map(c => c.trim()).join(', ') 
                        : 'Fast Food';
                    
                    let address = [tags['addr:housenumber'], tags['addr:street']]
                        .filter(Boolean).join(' ').trim();
                    if (!address) address = 'See map for location';

                    return {
                        name: name,
                        cuisine: cuisine,
                        address: address,
                        city: tags['addr:city'] || '',
                        postcode: tags['addr:postcode'] || '',
                        phone: tags.phone || tags['contact:phone'] || '',
                        website: tags.website || tags['contact:website'] || '',
                        hours: tags.opening_hours || '',
                        lat: parseFloat(center.lat),
                        lon: parseFloat(center.lon),
                        distance: distance(lat, lon, parseFloat(center.lat), parseFloat(center.lon)),
                        id: index + 1
                    };
                });

                allRestaurants.sort((a, b) => a.distance - b.distance);

                saveCache(STORAGE.restaurants, allRestaurants);
                saveCache(STORAGE.location, { lat: userLat, lon: userLon });
                saveCache(STORAGE.timestamp, new Date().toISOString());

                $('loadingSpinner').style.display = 'none';
                renderRestaurants(allRestaurants);
                success = true;
                break;
            }
        } catch (err) {
            console.warn(`Endpoint failed:`, err.message);
        }
    }

    if (!success) {
        showError('Could not fetch locations right now.<br>Try again in a few minutes.');
    }
};

const renderRestaurants = restaurants => {
    const maxDist = parseFloat($('distanceFilter').value) || 3;
    const filtered = restaurants.filter(r => r.distance <= maxDist);
    const list = $('restaurantsList');
    
    if (filtered.length === 0) {
        list.innerHTML = '<li class="restaurant-item">No restaurants found within this distance.</li>';
        return;
    }

    list.innerHTML = filtered.map(place => `
        <li class="restaurant-item" data-restaurant-id="${place.id}">
            <div class="restaurant-header">
                <strong>${place.name}</strong>
                <span class="distance-badge">${place.distance.toFixed(2)} km</span>
            </div>
            <small class="cuisine">${place.cuisine}</small><br>
            ${place.address ? `<small class="address">📍 ${place.address}</small><br>` : ''}
        </li>`).join('');

    // Add click listeners
    document.querySelectorAll('.restaurant-item').forEach(li => {
        li.addEventListener('click', () => {
            const restaurant = restaurants.find(r => r.id == li.dataset.restaurantId);
            if (restaurant) displayPlaceDetails(restaurant);
        });
    });
};

const displayPlaceDetails = place => {
    $('detailName').textContent = place.name;
    $('detailCuisine').textContent = place.cuisine || 'N/A';
    $('detailAddress').textContent = place.address || 'N/A';
    $('detailDistance').textContent = `${place.distance.toFixed(2)} km away`;
    $('detailCoords').textContent = `${place.lat.toFixed(5)}, ${place.lon.toFixed(5)}`;
    
    $('detailLinks').innerHTML = `
        <a href="https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}&zoom=17" target="_blank" class="link-btn">📍 OpenStreetMap</a>
        <a href="https://www.google.com/maps/search/${encodeURIComponent(place.name)}/@${place.lat},${place.lon},15z" target="_blank" class="link-btn">🗺️ Google Maps</a>
        ${place.website ? `<a href="${place.website.startsWith('http') ? place.website : 'https://' + place.website}" target="_blank" class="link-btn">🌐 Website</a>` : ''}`;
    
    $('detailExtra').innerHTML = place.phone 
        ? `<div>📞 ${place.phone}</div>${place.hours ? `<div>⏰ ${place.hours}</div>` : ''}`
        : 'No additional info available';
    
    $('selectedPlaceDetails').style.display = 'block';
};

const clearSelection = () => {
    $('selectedPlaceDetails').style.display = 'none';
};

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadCachedData();
    
    $('getLocationBtn').addEventListener('click', () => {
        if (!navigator.geolocation) {
            displayLocation(-25.06, 27.11);
            fetchFastFood(-25.06, 27.11);
            return;
        }

        $('loadingSpinner').style.display = 'block';

        navigator.geolocation.getCurrentPosition(
            pos => {
                displayLocation(pos.coords.latitude, pos.coords.longitude);
                fetchFastFood(pos.coords.latitude, pos.coords.longitude);
            },
            err => {
                console.warn('Geolocation failed:', err);
                displayLocation(-25.06, 27.11);
                fetchFastFood(-25.06, 27.11);
            },
            { timeout: 10000, enableHighAccuracy: true }
        );
    });

    const distFilter = $('distanceFilter');
    if (distFilter) {
        distFilter.addEventListener('input', e => {
            $('distanceValue').textContent = e.target.value + ' km';
            renderRestaurants(allRestaurants);
        });
    }

    const clearBtn = $('clearButton');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearSelection);
    }
});