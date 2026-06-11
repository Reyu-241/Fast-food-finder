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

const fetchFastFood = (lat, lon) => {
    $('loadingSpinner').style.display = 'block';
    
    setTimeout(() => {
        console.log('Using mock data for testing');

        // Mock restaurants near the user
        allRestaurants = [
            {
                name: 'KFC',
                cuisine: 'Fast Food',
                address: 'Main Street',
                city: '',
                postcode: '',
                phone: '011 123 4567',
                website: 'www.kfc.co.za',
                hours: '09:00-22:00',
                lat: lat + 0.01,
                lon: lon + 0.01,
                distance: 1.2,
                id: 1
            },
            {
                name: 'Burger King',
                cuisine: 'Fast Food',
                address: 'Park Avenue',
                city: '',
                postcode: '',
                phone: '011 987 6543',
                website: 'www.burgerking.co.za',
                hours: '09:00-23:00',
                lat: lat - 0.01,
                lon: lon - 0.01,
                distance: 1.8,
                id: 2
            },
            {
                name: 'Mcdonalds',
                cuisine: 'Fast Food',
                address: 'Shopping Mall',
                city: '',
                postcode: '',
                phone: '011 456 7890',
                website: 'www.mcdonalds.co.za',
                hours: '08:00-23:30',
                lat: lat + 0.02,
                lon: lon,
                distance: 2.3,
                id: 3
            },
            {
                name: 'Nando\'s',
                cuisine: 'Fast Food - Chicken',
                address: 'Downtown',
                city: '',
                postcode: '',
                phone: '011 234 5678',
                website: 'www.nandos.co.za',
                hours: '10:00-22:00',
                lat: lat,
                lon: lon + 0.02,
                distance: 2.5,
                id: 4
            },
            {
                name: 'Chicken Licken',
                cuisine: 'Fast Food - Chicken',
                address: 'Suburb Road',
                city: '',
                postcode: '',
                phone: '011 555 6666',
                website: 'www.chickenlicken.co.za',
                hours: '07:00-21:00',
                lat: lat - 0.02,
                lon: lon,
                distance: 2.8,
                id: 5
            }
        ];

        saveCache(STORAGE.restaurants, allRestaurants);
        saveCache(STORAGE.location, { lat: userLat, lon: userLon });
        saveCache(STORAGE.timestamp, new Date().toISOString());

        $('loadingSpinner').style.display = 'none';
        renderRestaurants(allRestaurants);
    }, 500);
};

    // Using OpenTripMap API (supports CORS, free, no API key)
    const searchUrl = `https://api.opentripmap.com/0.1/en/places/bbox?lon_min=${lon-0.05}&lon_max=${lon+0.05}&lat_min=${lat-0.05}&lat_max=${lat+0.05}&kinds=fast_food&limit=50`;

    console.log('API URL:', searchUrl);

    fetch(searchUrl)
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    })
    .then(data => {
        console.log('Raw data received:', data);
        console.log('Found:', data.features?.length || 0, 'results');
        
        if (!data.features || data.features.length === 0) {
            showError('No fast food restaurants found in this area.');
            return;
        }

        allRestaurants = data.features.map(feature => {
            const props = feature.properties;
            const coords = feature.geometry.coordinates;
            const plat = coords[1];
            const plon = coords[0];
            
            if (!plat || !plon) return null;

            return {
                name: props.name || 'Unnamed Fast Food',
                cuisine: 'Fast Food',
                address: props.address || 'Address not available',
                city: '',
                postcode: '',
                phone: props.phone || '',
                website: props.website || '',
                hours: '',
                lat: plat,
                lon: plon,
                distance: distance(userLat, userLon, plat, plon),
                id: props.xid || Math.random()
            };
        })
        .filter(r => r !== null)
        .filter(r => r.distance <= 5)
        .sort((a, b) => a.distance - b.distance);

        console.log('Processed restaurants:', allRestaurants.length);

        if (allRestaurants.length === 0) {
            showError('No restaurants within 5km. Try increasing the distance filter.');
            return;
        }

        saveCache(STORAGE.restaurants, allRestaurants);
        saveCache(STORAGE.location, { lat: userLat, lon: userLon });
        saveCache(STORAGE.timestamp, new Date().toISOString());

        $('loadingSpinner').style.display = 'none';
        renderRestaurants(allRestaurants);
    })
    .catch(error => {
        console.error('Fetch error:', error);
        showError(`API Error: ${error.message}. Please try again in a moment.`);
    });


const renderRestaurants = restaurants => {
    const maxDist = parseFloat($('distanceFilter').value) || 3;
    const filtered = restaurants.filter(r => r.distance <= maxDist);
    const list = $('restaurantsList');
    
    if (filtered.length === 0) {
        list.innerHTML = '<li class="restaurant-item">No restaurants at this distance.</li>';
        return;
    }

    list.innerHTML = filtered.map(place => `
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
            const restaurant = restaurants.find(r => r.id == li.dataset.restaurantId);
            e.dataTransfer.setData('application/json', JSON.stringify(restaurant));
            li.classList.add('dragging');
        });
        li.addEventListener('dragend', () => li.classList.remove('dragging'));
    });

    setupDropZone();
};

const displayPlaceDetails = place => {
    const dropZone = $('dropZone');
    const placeholder = dropZone.querySelector('.drop-placeholder');
    if (placeholder) placeholder.style.display = 'none';
    
    $('detailName').textContent = place.name;
    $('detailCuisine').textContent = place.cuisine || 'N/A';
    $('detailAddress').textContent = place.address || 'N/A';
    $('detailDistance').textContent = `${place.distance.toFixed(2)} km away`;
    $('detailCoords').textContent = `${place.lat.toFixed(5)}, ${place.lon.toFixed(5)}`;
    
    $('detailLinks').innerHTML = `
        <a href="https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}&zoom=17" target="_blank" class="link-btn">📍 OSM</a>
        <a href="https://www.google.com/maps/search/${encodeURIComponent(place.name)}/@${place.lat},${place.lon},15z" target="_blank" class="link-btn">🗺️ Maps</a>
        ${place.website ? `<a href="${place.website}" target="_blank" class="link-btn">🌐 Website</a>` : ''}`;
    
    $('detailExtra').innerHTML = place.phone 
        ? `<div>📞 ${place.phone}</div>${place.hours ? `<div>⏰ ${place.hours}</div>` : ''}`
        : 'No additional info available';
    
    $('selectedPlaceDetails').style.display = 'block';
};

const setupDropZone = () => {
    const zone = $('dropZone');
    zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
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
    const placeholder = dropZone.querySelector('.drop-placeholder');
    $('selectedPlaceDetails').style.display = 'none';
    if (placeholder) placeholder.style.display = 'block';
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
            showError('Geolocation is not supported by your browser');
            return;
        }

        console.log('Getting user location...');
        $('loadingSpinner').style.display = 'block';

        navigator.geolocation.getCurrentPosition(
            pos => {
                console.log('Location obtained:', pos.coords.latitude, pos.coords.longitude);
                displayLocation(pos.coords.latitude, pos.coords.longitude);
                fetchFastFood(pos.coords.latitude, pos.coords.longitude);
            },
            err => {
                console.error('Geolocation error:', err);
                $('loadingSpinner').style.display = 'none';
                const errorMsg = err.code === 1 
                    ? 'Location access denied. Allow location in browser settings.'
                    : err.code === 2
                    ? 'Location unavailable. Enable GPS or try WiFi.'
                    : 'Location request timed out. Try again.';
                showError(errorMsg);
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
