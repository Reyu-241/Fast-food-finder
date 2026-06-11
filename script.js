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
    $('restaurantsList').innerHTML = '<li class="restaurant-item">🔍 Loading mock data...</li>';
    
    console.log(`Generating mock restaurants near: ${lat}, ${lon}`);

    // Simulate API delay with timeout
    setTimeout(() => {
        console.log('Mock data generated');

        // Create mock restaurants around user location
        allRestaurants = [
            {
                name: 'KFC - Main Street',
                cuisine: 'Fried Chicken',
                address: '123 Main Street, Johannesburg',
                city: 'Johannesburg',
                postcode: '2000',
                phone: '011 123 4567',
                website: 'www.kfc.co.za',
                hours: '09:00-22:00',
                lat: lat + 0.005,
                lon: lon + 0.005,
                distance: distance(lat, lon, lat + 0.005, lon + 0.005),
                id: 1
            },
            {
                name: 'Burger King - Park Avenue',
                cuisine: 'Burgers & Fast Food',
                address: '456 Park Avenue, Johannesburg',
                city: 'Johannesburg',
                postcode: '2001',
                phone: '011 987 6543',
                website: 'www.burgerking.co.za',
                hours: '09:00-23:00',
                lat: lat - 0.007,
                lon: lon - 0.006,
                distance: distance(lat, lon, lat - 0.007, lon - 0.006),
                id: 2
            },
            {
                name: 'McDonald\'s - Shopping Mall',
                cuisine: 'Burgers, Fries & Shakes',
                address: 'Shopping Centre, Main Road',
                city: 'Johannesburg',
                postcode: '2002',
                phone: '011 456 7890',
                website: 'www.mcdonalds.co.za',
                hours: '08:00-23:30',
                lat: lat + 0.008,
                lon: lon + 0.002,
                distance: distance(lat, lon, lat + 0.008, lon + 0.002),
                id: 3
            },
            {
                name: 'Nando\'s - Downtown',
                cuisine: 'Peri-Peri Chicken',
                address: '789 Downtown Centre',
                city: 'Johannesburg',
                postcode: '2003',
                phone: '011 234 5678',
                website: 'www.nandos.co.za',
                hours: '10:00-22:00',
                lat: lat + 0.003,
                lon: lon + 0.009,
                distance: distance(lat, lon, lat + 0.003, lon + 0.009),
                id: 4
            },
            {
                name: 'Chicken Licken - Suburb Road',
                cuisine: 'Fried Chicken & Chips',
                address: '321 Suburb Road, Croydon',
                city: 'Johannesburg',
                postcode: '2198',
                phone: '011 555 6666',
                website: 'www.chickenlicken.co.za',
                hours: '07:00-21:00',
                lat: lat - 0.004,
                lon: lon + 0.007,
                distance: distance(lat, lon, lat - 0.004, lon + 0.007),
                id: 5
            },
            {
                name: 'Steers - City Centre',
                cuisine: 'Burgers & Steak',
                address: '555 City Centre Plaza',
                city: 'Johannesburg',
                postcode: '2004',
                phone: '011 777 8888',
                website: 'www.steers.co.za',
                hours: '08:00-22:00',
                lat: lat - 0.009,
                lon: lon - 0.008,
                distance: distance(lat, lon, lat - 0.009, lon - 0.008),
                id: 6
            },
            {
                name: 'Debonairs Pizza - Crescent',
                cuisine: 'Pizza & Fast Food',
                address: '999 Crescent Avenue',
                city: 'Johannesburg',
                postcode: '2199',
                phone: '011 222 3333',
                website: 'www.debonairs.co.za',
                hours: '11:00-23:00',
                lat: lat + 0.006,
                lon: lon - 0.005,
                distance: distance(lat, lon, lat + 0.006, lon - 0.005),
                id: 7
            },
            {
                name: 'Fishaways - River Walk',
                cuisine: 'Fish & Chips',
                address: '777 River Walk Mall',
                city: 'Johannesburg',
                postcode: '2195',
                phone: '011 444 5555',
                website: 'www.fishaways.co.za',
                hours: '09:00-21:00',
                lat: lat - 0.006,
                lon: lon + 0.004,
                distance: distance(lat, lon, lat - 0.006, lon + 0.004),
                id: 8
            },
            {
                name: 'Wimpy - Station Road',
                cuisine: 'Burgers & Breakfast',
                address: '111 Station Road',
                city: 'Johannesburg',
                postcode: '2000',
                phone: '011 333 4444',
                website: 'www.wimpy.co.za',
                hours: '06:30-22:00',
                lat: lat + 0.004,
                lon: lon - 0.009,
                distance: distance(lat, lon, lat + 0.004, lon - 0.009),
                id: 9
            },
            {
                name: 'Subway - Market Square',
                cuisine: 'Sandwiches & Salads',
                address: '666 Market Square',
                city: 'Johannesburg',
                postcode: '2001',
                phone: '011 666 7777',
                website: 'www.subway.co.za',
                hours: '07:00-20:00',
                lat: lat - 0.002,
                lon: lon - 0.004,
                distance: distance(lat, lon, lat - 0.002, lon - 0.004),
                id: 10
            }
        ];

        // Sort by distance
        allRestaurants.sort((a, b) => a.distance - b.distance);

        console.log('Generated:', allRestaurants.length, 'mock restaurants');

        // Save to cache
        saveCache(STORAGE.restaurants, allRestaurants);
        saveCache(STORAGE.location, { lat: userLat, lon: userLon });
        saveCache(STORAGE.timestamp, new Date().toISOString());

        $('loadingSpinner').style.display = 'none';
        renderRestaurants(allRestaurants);
    }, 1000); // 1 second delay to simulate API call
};

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
            console.log('Geolocation not supported, using mock location');
            // Use mock location in South Africa (Krugersdorp area)
            displayLocation(-25.06, 27.11);
            fetchFastFood(-25.06, 27.11);
            return;
        }

        console.log('Requesting real location...');
        $('loadingSpinner').style.display = 'block';

        navigator.geolocation.getCurrentPosition(
            pos => {
                console.log('Real location obtained:', pos.coords.latitude, pos.coords.longitude);
                displayLocation(pos.coords.latitude, pos.coords.longitude);
                fetchFastFood(pos.coords.latitude, pos.coords.longitude);
            },
            err => {
                console.warn('Real location failed, using mock location:', err);
                // Fallback to mock location
                displayLocation(-25.06, 27.11);
                fetchFastFood(-25.06, 27.11);
            },
            { timeout: 5000, enableHighAccuracy: true }
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