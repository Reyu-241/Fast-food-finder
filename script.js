const fetchFastFood = async (lat, lon) => {
    $('loadingSpinner').style.display = 'block';
    $('restaurantsList').innerHTML = '<li class="restaurant-item">🔍 Searching nearby fast food places...</li>';
    
    console.log(`Fetching fast food near: ${lat}, ${lon}`);

    const radius = 10000; // 10km in meters
    const query = `
[out:json][timeout:25];
(
  node["amenity"="fast_food"](around:${radius},${lat},${lon});
  way["amenity"="fast_food"](around:${radius},${lat},${lon});
  relation["amenity"="fast_food"](around:${radius},${lat},${lon});
);
out center;
`;

    // Multiple public Overpass instances (in order of preference)
    const endpoints = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.private.coffee/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://lz4.overpass-api.de/api/interpreter'
    ];

    let success = false;

    for (const endpoint of endpoints) {
        try {
            console.log(`Trying endpoint: ${endpoint}`);
            
            const response = await fetch(endpoint, {
                method: 'POST',
                body: `data=${encodeURIComponent(query)}`,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'FastFood-Locator-App'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data.elements && data.elements.length > 0) {
                console.log(`✅ Success with ${endpoint} - Found ${data.elements.length} places`);
                
                allRestaurants = data.elements.map((el, index) => {
                    const tags = el.tags || {};
                    const center = el.center || el;
                    
                    const name = tags.name || 'Unnamed Fast Food';
                    const cuisine = tags.cuisine 
                        ? tags.cuisine.split(';').map(c => c.trim()).join(', ') 
                        : 'Fast Food';
                    
                    let address = [tags['addr:housenumber'], tags['addr:street']]
                        .filter(Boolean).join(' ').trim();
                    if (!address) address = tags['addr:full'] || 'See map for location';
                    
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

                // Save cache
                saveCache(STORAGE.restaurants, allRestaurants);
                saveCache(STORAGE.location, { lat: userLat, lon: userLon });
                saveCache(STORAGE.timestamp, new Date().toISOString());

                $('loadingSpinner').style.display = 'none';
                renderRestaurants(allRestaurants);
                success = true;
                break;
            }
        } catch (err) {
            console.warn(`Endpoint ${endpoint} failed:`, err.message);
        }
    }

    if (!success) {
        console.error('All Overpass endpoints failed');
        showError('Could not fetch real locations right now.<br>Overpass servers are busy/unavailable.<br><small>Try again in a few minutes or use cached data.</small>');
        
        // Optional: fallback to mock data if no cache
        if (allRestaurants.length === 0) {
            console.log('Falling back to mock data...');
            // You can keep a small mock array here as temporary fallback if you want
        }
    }
};