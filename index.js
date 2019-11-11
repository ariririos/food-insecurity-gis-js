console.clear();
let mapboxToken = "pk.eyJ1IjoicmlvYzA3MTkiLCJhIjoiY2sydTA3NmlsMWgydDNtbWJueDczNTVyYSJ9.OXt2qQjXDCMVpDZA5pf3gw";


fetch('./total_pop_AHY1.json').then(async(data) => {
    let map = L.map('map', {
        center: [27.243836, -80.829849], // Okeechobee
        zoom: 10 // about county level
    });
    L.tileLayer("http://api.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={mapboxToken}", { id: 'mapbox.light', mapboxToken }).addTo(map);
    let geojson = await data.json();
    // let oneFeat = geojson.features[1];
    let moddedGeojson = {
        type: geojson.type,
        features: geojson.features.map(feat => {
            let featCopy = Object.assign(feat);
            featCopy.geometry.coordinates = [feat.geometry.coordinates[0].map(coordPair => {
                let firstProj = "+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=37.5 +lon_0=-96 +x_0=0 +y_0=0 +ellps=GRS80 +datum=NAD83 +units=m no_defs";
                let secondProj = "WGS84";
                return proj4(firstProj, secondProj, coordPair);
            })];
            return featCopy;
        })
    }

    L.geoJSON(moddedGeojson, { style: { color: "#0f0", weight: 5, opacity: 0.85 }}).addTo(map);
});