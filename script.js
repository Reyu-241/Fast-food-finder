const fetchFastFood = (lat, lon) => {
    $('loadingSpinner').style.display = 'block';
    $('restaurantsList').innerHTML = '<li class="restaurant-item">Loading...</li>';
    
    console.log(`Searching near: ${lat}, ${lon}`);

    // Search for fast food restaurants
    const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=fast+food&lat=${lat}&lon=${lon}&radius=5000&limit=50`;

    fetch(searchUrl)
    .then(r => r.json())
    .then(data => {
        console.log('Found:', data.length, 'places');
        
        if (!data || data.length === 0) {
            showError('No fast food restaurants found nearby.');
            return;
        }

        allRestaurants = data.map(place => ({
            name: place.name || 'Unnamed',
            cuisine: 'Fast Food',
            address: place.address || 'Address not available',
            city: '',
            postcode: '',
            phone: '',
            website: '',
            hours: '',
            lat: parseFloat(place.lat),
            lon: parseFloat(place.lon),
            distance: distance(userLat, userLon, parseFloat(place.lat), parseFloat(place.lon)),
            id: place.osm_id
        })).filter(r => r.distance <= 5).sort((a, b) => a.distance - b.distance);

        if (allRestaurants.length === 0) {
            showError('No restaurants within 5km.');
            return;
        }

        saveCache(STORAGE.restaurants, allRestaurants);
        saveCache(STORAGE.location, { lat: userLat, lon: userLon });
        saveCache(STORAGE.timestamp, new Date().toISOString());

        $('loadingSpinner').style.display = 'none';
        renderRestaurants(allRestaurants);
    })
    .catch(error => {
        console.error('Error:', error);
        showError(`API Error: ${error.message}`);
    });
};