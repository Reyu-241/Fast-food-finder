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

const fetchFastFood = (lat, lon) => {
    const query = `[out:json][timeout:25];(node[amenity=fast_food](around:5000,${lat},${lon});way[amenity=fast_food](around:5000,${lat},${lon});relation[amenity=fast_food](around:5000,${lat},${lon}););out center;`;
    
    fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query)
    })
    .then(r => r.json())
    .then(data => {
        allRestaurants = (data.elements || []).map(place => {
            const [lat, lon] = place.type === 'node' 
                ? [place.lat, place.lon] 
                : [place.center?.lat, place.center?.lon];
            
            return lat && lon ? {
                name: place.tags?.name || 'Unnamed',
                cuisine: place.tags?.cuisine?.split(';').join(', ') || 'Fast Food',
                address: place.tags?.['addr:street'] || 'N/A',
                city: place.tags?.['addr:city'] || '',
                postcode: place.tags?.['addr:postcode'] || '',
                phone: place.tags?.phone || '',
                website: place.tags?.website || '',
                hours: place.tags?.opening_hours || '',
                lat, lon,
                distance: distance(userLat, userLon, lat, lon),
                id: place.id
            } : null;
        }).filter(Boolean).sort((a, b) => a.distance - b.distance);
        
        saveCache(STORAGE.restaurants, allRestaurants);
        saveCache(STORAGE.location, { lat: userLat, lon: userLon });
        saveCache(STORAGE.timestamp, new Date().toISOString());
        
        renderRestaurants(allRestaurants);
    })
    .catch(e => {
        $('loadingSpinner').style.display = 'none';
        $('restaurantsList').innerHTML = '<li class="restaurant-item" style="color:red;">Error loading. Try again.</li>';
    });
};

const renderRestaurants = restaurants => {
    const maxDist = parseFloat($('distanceFilter').value) || 3;
    const filtered = restaurants.filter(r => r.distance <= maxDist);
    const list = $('restaurantsList');
    
    list.innerHTML = filtered.length === 0 
        ? '<li class="restaurant-item">No restaurants at this distance.</li>'
        : filtered.map(place => `
            <li class="restaurant-item" draggable="true" data-restaurant-id="${place.id}">
                <div class="restaurant-header">
                    <strong>${place.name}</strong>
                    <span class="distance-badge">${place.distance.toFixed(2)} km</span>
                </div>
                <small class="cuisine">${place.cuisine}</small><br>
                ${place.address ? `<small class="address">📍 ${place.address}</small><br>` : ''}
                <small class="drag-hint-item">🖱️ Drag for details</small>
            </li>`).join('');

    document.querySelectorAll('.restaurant-item').forEach(li => {
        li.addEventListener('dragstart', e => {
            e.dataTransfer.setData('application/json', 
                JSON.stringify(restaurants.find(r => r.id == li.dataset.restaurantId)));
            li.classList.add('dragging');
        });
        li.addEventListener('dragend', () => li.classList.remove('dragging'));
    });

    setupDropZone();
};

const displayPlaceDetails = place => {
    const dropZone = $('dropZone');
    dropZone.querySelector('.drop-placeholder').style.display = 'none';
    
    $('detailName').textContent = place.name;
    $('detailCuisine').textContent = place.cuisine || 'N/A';
    $('detailAddress').textContent = [place.address, place.city, place.postcode].filter(Boolean).join(', ') || 'N/A';
    $('detailDistance').textContent = `${place.distance.toFixed(2)} km away`;
    $('detailCoords').textContent = `${place.lat.toFixed(5)}, ${place.lon.toFixed(5)}`;
    
    $('detailLinks').innerHTML = `
        <a href="https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}&zoom=17" target="_blank" class="link-btn">📍 OSM</a>
        <a href="https://www.google.com/maps/search/${encodeURIComponent(place.name)}/@${place.lat},${place.lon},15z" target="_blank" class="link-btn">🗺️ Maps</a>
        ${place.website ? `<a href="${place.website}" target="_blank" class="link-btn">🌐 Website</a>` : ''}`;
    
    $('detailExtra').innerHTML = place.phone 
        ? `<div>📞 ${place.phone}</div>${place.hours ? `<div>⏰ ${place.hours}</div>` : ''}`
        : 'No info available';
    
    $('selectedPlaceDetails').style.display = 'block';
};

const setupDropZone = () => {
    const zone = $('dropZone');
    ['dragover', 'drop'].forEach(event => {
        zone.addEventListener(event, e => e.preventDefault());
    });
    zone.addEventListener('dragover', () => zone.classList.add('drag-over'));
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        zone.classList.remove('drag-over');
        try {
            displayPlaceDetails(JSON.parse(e.dataTransfer.getData('application/json')));
        } catch (err) {
            console.error('Drop error:', err);
        }
    });
};

const clearSelection = () => {
    const dropZone = $('dropZone');
    $('selectedPlaceDetails').style.display = 'none';
    dropZone.querySelector('.drop-placeholder').style.display = 'block';
};

const clearCache = () => {
    Object.values(STORAGE).forEach(key => localStorage.removeItem(key));
    alert('Cache cleared!');
    location.reload();
};

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadCachedData();
    
    $('getLocationBtn').addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert('Geolocation not supported');
            return;
        }
        $('loadingSpinner').style.display = 'block';
        navigator.geolocation.getCurrentPosition(
            pos => {
                displayLocation(pos.coords.latitude, pos.coords.longitude);
                fetchFastFood(pos.coords.latitude, pos.coords.longitude);
            },
            err => {
                $('loadingSpinner').style.display = 'none';
                alert(err.code === 1 ? 'Location access denied' : 'Location unavailable');
            }
        );
    });

    $('distanceFilter').addEventListener('input', e => {
        $('distanceValue').textContent = e.target.value + ' km';
        renderRestaurants(allRestaurants);
    });

    $('clearButton').addEventListener('click', clearSelection);
});