console.clear();
let mapboxToken = "pk.eyJ1IjoicmlvYzA3MTkiLCJhIjoiY2sydTA3NmlsMWgydDNtbWJueDczNTVyYSJ9.OXt2qQjXDCMVpDZA5pf3gw";

const propAliases = {
    totalPop: "nhgis0011_ds233_20175_2017_blck_grp.csv.AHY1E001", // works
    medianIncome: "nhgis0011_ds233_20175_2017_blck_grp.csv.AH1PE001", // works
    numHouseholdsWithPubAsstIncome: "nhgis0011_ds233_20175_2017_blck_grp.csv.AH19E002", // works
    perCapitaIncome: "nhgis0011_ds233_20175_2017_blck_grp.csv.AH2RE001", // works
    numHouseholdsReceivedSNAP: "nhgis0011_ds233_20175_2017_blck_grp.csv.AH3IE002", // works
    medianGrossRent: "nhgis0011_ds233_20175_2017_blck_grp.csv.AH5RE001", // works
    totalPopBlock: "nhgis0016_ds172_2010_block.csv.H7V001", // works
    renterOccupiedHousingUnitsBlock: "nhgis0016_ds172_2010_block.csv.IFF004", // works
    numLatinoBlock: "nhgis0016_ds172_2010_block.csv.H7Z010" // works
};


/*
TODO: layering to get heatmaps and looking at them next to each other
then after that start mapping the road networks
pub asst income vs households with SNAP
rent vs income
will prob be missing some folks under Latino %
better way to do this is to combine block info into the block groups
could also do the other way by using the block group info for each block (weighted average by geographic area and by pop of the block)
- TODO: do weighted averages by the pop of the block
could generate a new weighted average by weighting the averages for each metric by their correlation with a third variable:
// - e.g. W_1 * (1 - r) + W_2 * r where W_1 = total pop; W_2 = Latino, r = corr b/w Latino and SNAP
*/

fetch('./FLblockgroups.json').then(async(data) => {
    let map = L.map('map', {
        center: [27.243836, -80.829849], // Okeechobee
        zoom: 10 // about county level
    });
    L.tileLayer("http://api.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={mapboxToken}", { id: 'mapbox.dark', mapboxToken }).addTo(map);
    let geojson = await data.json();
    let moddedGeojson = {
        type: geojson.type,
        features: geojson.features.filter(feat => feat.geometry.type == "Polygon").map(feat => {
            let featCopy = Object.assign(feat);
            // FIXME: not dealing with multipolygons here
            featCopy.geometry.coordinates = [feat.geometry.coordinates[0].map(coordPair => {
                let firstProj = "+proj=aea +lat_1=29.5 +lat_2=45.5 +lat_0=37.5 +lon_0=-96 +x_0=0 +y_0=0 +ellps=GRS80 +datum=NAD83 +units=m no_defs";
                let secondProj = "WGS84";
                return proj4(firstProj, secondProj, coordPair);
            })];
            return featCopy;
        })
    }

    const chloroplethPropName = propAliases.numLatinoBlock;
    const perCapitaPopulationName = propAliases.totalPopBlock;
    const perCapita = true;
    const featPropGetter = feat => {
        if (perCapita) return (feat.properties[chloroplethPropName] / feat.properties[perCapitaPopulationName]) || 0;
        else return feat.properties[chloroplethPropName];
    };

    // TODO: per capita by having the name for population here as a const, then replacing all instances of

    let propValues = moddedGeojson.features.map(feat => featPropGetter(feat)).filter(x => x != null);
    let propClasses = jenks(propValues, 5);
    // FIXME: some sort of off-by-one error in the coloring here
    let getColorForPolygon = v => {
        let colorBracket = 0;
        for (let i = 0; i < propClasses.length; i++) {
            if (v >= propClasses[i]) colorBracket = i;
        }
        return colorbrewer.RdPu[5][colorBracket];
    };
    let polygonIdsByColor = moddedGeojson.features.reduce((acc, feat) => {
        acc[feat.id] = getColorForPolygon(featPropGetter(feat));
        return acc;
    }, {});

    let style = feature => ({
        fillColor: polygonIdsByColor[feature.id],
        weight: 2,
        fillOpacity: 0.5
    });

    let onEachFeature = (feature, layer) => layer.bindPopup(`Block group property value: ${perCapita ? featPropGetter(feature) + " for pop of " + feature.properties[perCapitaPopulationName] : featPropGetter(feature)}, maps to color ${polygonIdsByColor[feature.id]}`);

    // legend

    let legend = L.control({ position: "bottomright" });
    legend.onAdd = map => {
        let div = L.DomUtil.create("div", "info legend"),
            labels = [];
        for (let i = 1; i < propClasses.length; i++) {
            div.innerHTML += `<div><i style="background: ${getColorForPolygon(propClasses[i])}"></i>${propClasses[i]}${propClasses[i+1] ? "-" + propClasses[i+1] + "<br>": "+"}</div>`.trim();
        }
        return div;
    }
    legend.addTo(map);

    L.geoJSON(moddedGeojson, { style, onEachFeature }).addTo(map);
});