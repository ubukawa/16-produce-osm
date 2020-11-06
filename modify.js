const geojsonArea = require('@mapbox/geojson-area')

const preProcess = (f) => {
  f.tippecanoe = {
    layer: 'other',
    minzoom: 15,
    maxzoom: 15
  }
  // name
  if (
    f.properties.hasOwnProperty('en_name') ||
    f.properties.hasOwnProperty('int_name') ||
    f.properties.hasOwnProperty('name') ||
    f.properties.hasOwnProperty('ar_name')
  ) {
    let name = ''
    if (f.properties['en_name']) {
      name = f.properties['en_name']
    } else if (f.properties['ar_name']) {
      name = f.properties['ar_name']
    } else if (f.properties['int_name']) {
      name = f.properties['int_name']
    } else {
      name = f.properties['name']
    }
    delete f.properties['en_name']
    delete f.properties['ar_name']
    delete f.properties['int_name']
    delete f.properties['name']
    f.properties.name = name
  }
  return f
}

const postProcess = (f) => {
  delete f.properties['_database']
  delete f.properties['_table']
  return f
}

const flap = (f, defaultZ) => {
  switch (f.geometry.type) {
    case 'MultiPolygon':
    case 'Polygon':
      let mz = Math.floor(
        19 - Math.log2(geojsonArea.geometry(f.geometry)) / 2
      )
      if (mz > 15) { mz = 15 }
      if (mz < 6) { mz = 6 }
      return mz
    default:
      return defaultZ ? defaultZ : 10
  }
}

const minzoomRoad = (f) => {
  switch (f.properties.highway) {
    case 'path':
    case 'pedestrian':
    case 'footway':
    case 'cycleway':
    case 'living_street':
    case 'steps':
    case 'bridleway':
      return 15
    case 'residential':
    case 'service':
    case 'track':
    case 'unclassified':
      return 14
    case 'road':
    case 'tertiary_link':
      return 13
    case 'tertiary':
    case 'secondary_link':
      return 12
    case 'secondary':
    case 'primary_link':
      return 11
    case 'primary':
    case 'trunk_link':
      return 10
    case 'trunk':
    case 'motorway_link':
      return 8
    case 'motorway':
      return 6
    default:
      return 15
  }
}

const minzoomWater = (f) => {
  if (f.properties.natural === 'water') {
    return 6
  } else if (f.properties.natural === 'glacier') {
    return 6
  } else if (f.properties.natural === 'wetland') {
    return 8
  } else if (f.properties.waterway === 'riverbank') {
    return 15
  } else if (f.properties.landuse === 'basin') {
    return 13
  } else if (f.properties.landuse === 'reservoir') {
    return 13
  } else {
    throw new Error(`monzoomWater: ${f.properties}`)
  }
}

const osmPoi = (f) => {
  f.tippecanoe = {
    layer: 'poi',
    minzoom: flap(f, 14),
    maxzoom: 15
  }
  return f
}

const lut = {
  // 1. nature
  osm_planet_landuse_natural_large: f => {
    f.tippecanoe = {
      layer: 'nature-l',
      minzoom: 11,
      maxzoom: 15
    }
    switch (f.properties.fclass) {
      case 'bare_rock':
      case 'grassland':
      case 'heath':
        f.properties.natural = f.properties.fclass
        break
      case 'park':
      case 'common':
    //  case 'recreation_ground':
        f.properties.leisure = f.properties.fclass
        break
      case 'meadow':
      case 'allotments':
      case 'recreation_ground':
      case 'orchard':
      case 'vineyard':
      case 'quarry':
      case 'farm':
      case 'farmyard':
      case 'grass':
      case 'scrub':
      case 'village_green':
        f.properties.landuse = f.properties.fclass
        break
      default:
        throw new Error(`osm_planet_landuse_natural_large: ${f.properties.fclass}`)
    }
    delete f.properties['fclass']
    return f
  },
  osm_planet_landuse_natural_medium: f => {
    f.tippecanoe = {
      layer: 'nature-m',
      minzoom: 8,
      maxzoom: 15
    }
    switch (f.properties.fclass) {
      case 'forest':
      case 'farm':
      case 'farmyard':
      case 'farmland':
      case 'grass':
        f.properties.landuse = f.properties.fclass
        break
      case 'wood':
      case 'scrub':
        f.properties.natural = f.properties.fclass
        break
      default:
        throw new Error(`osm_planet_landuse_natural_medium: ${f.properties.fclass}`)
    }
    delete f.properties['fclass']
    return f
  },

// 2. water
  osm_planet_water: f => {
    switch (f.properties.fclass) {
      case 'water':
//      case 'glacier': 
      case 'wetland':
        f.properties.natural = f.properties.fclass
        break
      case 'riverbank':
        f.properties.waterway = f.properties.fclass
        break
      case 'basin':
      case 'reservoir':
        f.properties.landuse = f.properties.fclass
        break
    }
    f.tippecanoe = {
      layer: 'water',
      minzoom: minzoomWater(f),
      maxzoom: 15
    }
    delete f.properties['fclass']
    return f
  },
  osm_planet_waterways_small: f => {
    f.tippecanoe = {
      layer: 'water',
      minzoom: 7,
      maxzoom: 10
    }
    f.properties.waterway = f.properties.fclass
    delete f.properties['fclass']
    return f
  },
  osm_planet_waterways_large: f => {
    f.tippecanoe = {
      layer: 'water',
      minzoom: 11,
      maxzoom: 15
    }
    f.properties.waterway = f.properties.fclass
    delete f.properties['fclass']
    return f
  },

// 4. road
  osm_planet_major_roads: f => {
    f.properties.highway = f.properties.fclass
    f.tippecanoe = {
      layer: 'road',
      minzoom: minzoomRoad(f),
      maxzoom: 15
    }
    delete f.properties['fclass']
    return f
  },
  osm_planet_minor_roads: f => {
    f.properties.highway = f.properties.fclass
    f.tippecanoe = {
      layer: 'road',
      minzoom: minzoomRoad(f),
      maxzoom: 15
    }
    delete f.properties['fclass']
    return f
  },
  // 5. railway
  osm_planet_railways: f => {
    f.tippecanoe = {
      layer: 'railway',
      minzoom: 9,
      maxzoom: 15
    }
    f.properties.railway = f.properties.fclass
    delete f.properties['fclass']
    return f
  },
  // 6. route
  osm_planet_ferries: f => {
    f.tippecanoe = {
      layer: 'ferry',
      minzoom: 6,
      maxzoom: 15
    }
    f.properties.route = f.properties.fclass
    delete f.properties['fclass']
    return f
  },
  // 7. structure
  osm_planet_runways: f => {
    f.tippecanoe = {
      layer: 'runway',
      minzoom: 11,
      maxzoom: 15
    }
    f.properties.aeroway = f.properties.fclass
    delete f.properties['fclass']
    return f
  },
  osm_planet_highway_areas: f => {
    f.tippecanoe = {
      layer: 'highway_area',
      minzoom: flap(f, 10),
      maxzoom: 15
    }
    f.properties.highway = f.properties.fclass
    delete f.properties['fclass']
    return f
  },
  osm_planet_transport_areas: f => {
    f.tippecanoe = {
      layer: 'trans_area',
      minzoom: flap(f, 10),
      maxzoom: 15
    }
    switch (f.properties.fclass) {
      case 'airport':
      case 'bus_station':
      case 'ferry_terminal':
      case 'pedestrian':
      case 'service':
        f.properties.amenity = f.properties.fclass
        break
      case 'aerodrome':
      case 'airfield':
      case 'helipad':
      case 'aeroway':
      case 'apron':
        f.properties.aeroway = f.properties.fclass
        break
      case 'station':
      case 'halt':
      case 'tram_stop':
        f.properties.railway = f.properties.fclass
        break
      case 'stop_position':
        f.properties.public_transport = f.properties.fclass
        break
      case 'bus_stop':
        f.properties.highway = f.properties.fclass
        break
      case 'pier':
        f.properties.landuse = f.properties.fclass
        break
      default:
        throw new Error(`osm_planet_transport_areas: ${f.properties.fclass}`)
    }
    delete f.properties['fclass']
    return f
  },
  // 8. building
  osm_planet_landuse_urban: f => {
    f.tippecanoe = {
      layer: 'lu_urban',
      minzoom: 10,
      maxzoom: 15
    }
    f.properties.landuse = f.properties.fclass
    delete f.properties['fclass']
    return f
  },
  osm_planet_buildings: f => {
    f.tippecanoe = {
      layer: 'building',
      minzoom: 12,
      maxzoom: 15
    }
    f.properties.building = f.properties.fclass
    delete f.properties['fclass']
    return f
  },
  osm_planet_other_buildings: f => {
    f.tippecanoe = {
      layer: 'building_o',
      minzoom: 12,
      maxzoom: 15
    }
    f.properties.building = f.properties.fclass
    delete f.properties['fclass']
    return f
  },
  // 9. place
  osm_planet_pois_heritage: f => {
    switch (f.properties.fclass) {
      case 'theatre':
      case 'grave_yard':
        f.properties.amenity = f.properties.fclass
        break
      case 'museum':
        f.properties.tourism = f.properties.fclass
        break
      case 'monument':
      case 'memorial':
      case 'castle':
      case 'fort':
      case 'archaeological_site':
      case 'ruins':
      case 'cemetery':
        f.properties.historic = f.properties.fclass
        break
      default:
        throw new Error(`osm_planet_pois_heritage: ${f.properties.fclass}`)
    }
    delete f.properties['fclass']
    f.tippecanoe = {
    layer: 'poi',
    minzoom: 15,
    maxzoom: 15
    }
  return f
  },
  osm_planet_pois_other: f => {
    switch (f.properties.fclass) {
      case 'golf_course':
      case 'water_park':
      case 'pitch':
      case 'stadium':
      case 'sports_centre':
      case 'swimming_pool':
      case 'park':
      case 'playground':
        f.properties.leisure = f.properties.fclass
        break
      case 'zoo':
      case 'theme_park':
        f.properties.tourism = f.properties.fclass
        break
      case 'tower':
      case 'water_tower':
      case 'communications_tower':
      case 'windmill':
      case 'lighthouse':
        f.properties.man_made = f.properties.fclass
        break
      case 'car_repair':
      case 'supermarket':
      case 'kiosk':
      case 'department_store':
      case 'clothes':
      case 'books':
      case 'butcher':
      case 'beverages':
      case 'alcohol':
      case 'optician':
      case 'stationery':
      case 'mobile_phone':
      case 'greengrocer':
      case 'car':
      case 'furniture':
      case 'computer':
      case 'hairdresser':
      case 'bakery':
      case 'travel_agency':
        f.properties.shop = f.properties.fclass
        break
      case 'bank':
      case 'atm':
      case 'marketplace':
      case 'car_rental':
      case 'pharmacy':
      case 'waste_disposal':
        f.properties.amenity = f.properties.fclass
        break
      case 'swimming':
      case 'tennis':
        f.properties.sport = f.properties.fclass
        break
      case 'station':
        f.properties.power = 'p_station'
        break
      case 'landfill':
        f.properties.landuse = f.properties.fclass
        break
      default:
        throw new Error(`osm_planet_pois_other: ${f.properties.fclass}`)
    }
    delete f.properties['fclass']
    f.tippecanoe = {
    layer: 'poi',
    minzoom: 15,
    maxzoom: 15
    }
  return f
  },
  osm_planet_pois_public: f => {
    switch (f.properties.fclass) {
      case 'public_building':
      case 'townhall':
      case 'embassy':
      case 'courthouse':
      case 'police':
      case 'prison':
      case 'fire_station':
      case 'post_office':
      case 'social_facility':
      case 'customs':
        f.properties.amenity = f.properties.fclass
        break
      case 'government':
      case 'ngo':
        f.properties.office = f.properties.fclass
        break
      default:
        throw new Error(`osm_planet_pois_public: ${f.properties.fclass}`)
    }
    delete f.properties['fclass']
    f.tippecanoe = {
    layer: 'poi',
    minzoom: 11,
    maxzoom: 15
    }
  return f
  },
  osm_planet_pois_services: f => {
    switch (f.properties.fclass) {
      case 'shelter':
      case 'school':
      case 'college':
      case 'university':
      case 'hospital':
      case 'restaurant':
      case 'fast_food':
      case 'cafe':
      case 'food_court':
      case 'biergarten':
      case 'dentist':
      case 'doctor':
      case 'doctors':
      case 'clinic':
      case 'veterinary':
      case 'kindergarten':
      case 'nightclub':
      case 'pub':
      case 'bar':
      case 'community_centre':
      case 'cinema':
      case 'library':
      case 'arts_centre':
      case 'money_transfer':
      case 'bureau_de_change':
        f.properties.amenity = f.properties.fclass
        break
      case 'bed_and_breakfast':
      case 'hotel':
      case 'motel':
      case 'guest_house':
      case 'hostel':
      case 'chalet':
        f.properties.tourism = f.properties.fclass
        break
      default:
        throw new Error(`osm_planet_pois_services: ${f.properties.fclass}`)
    }
    delete f.properties['fclass']
    f.tippecanoe = {
    layer: 'poi',
    minzoom: 13,
    maxzoom: 15
    }
  return f
  },
  osm_planet_pois_traffic: f => {
    switch (f.properties.fclass) {
      case 'fuel':
        f.properties.amenity = f.properties.fclass
        break
      default:
        throw new Error(`osm_planet_pois_traffic: ${f.properties.fclass}`)
    }
    delete f.properties['fclass']
    f.tippecanoe = {
    layer: 'poi',
    minzoom: 13,
    maxzoom: 15
    }
  return f
  },
  osm_planet_pois_transport: f => {
    switch (f.properties.fclass) {
      case 'airport':
      case 'bus_station':
      case 'ferry_terminal':
      case 'parking':
      case 'harbour':
        f.properties.amenity = f.properties.fclass
        break
      case 'aerodrome':
      case 'airfield':
      case 'helipad':
      case 'aeroway':
        f.properties.aeroway = f.properties.fclass
        break
      case 'station':
      case 'halt':
      case 'tram_stop':
        f.properties.railway = f.properties.fclass
        break
      case 'stop_position':
        f.properties.public_transport = f.properties.fclass
        break
      case 'bus_stop':
        f.properties.highway = f.properties.fclass
        break
      default:
        throw new Error(`osm_planet_pois_transport: ${f.properties.fclass}`)
    }
    delete f.properties['fclass']
    f.tippecanoe = {
    layer: 'poi_trans',
    maxzoom: 15
    }
    switch (f.properties.z_order) {
      case 5:
        f.tippecanoe.minzoom = 7
        break
      default:
        f.tippecanoe.minzoom = 9
    }
  return f
  },
  osm_planet_pois_water: f => {
    switch (f.properties.fclass) {
      case 'drinking_water':
        f.properties.amenity = f.properties.fclass
        break
      case 'wastewater_plant':
      case 'watermill':
      case 'water_works':
      case 'water_well':
      case 'storage_tank':
        f.properties.man_made = f.properties.fclass
        break
      default:
        throw new Error(`osm_planet_pois_water: ${f.properties.fclass}`)
    }
    delete f.properties['fclass']
    f.tippecanoe = {
    layer: 'poi',
    minzoom: 15,
    maxzoom: 15
    }
  return f
  },
  osm_planet_pois_worship: f => {
    switch (f.properties.fclass) {
      case 'christian':
      case 'jewish':
      case 'muslim':
      case 'buddhist':
      case 'hindu':
      case 'taoist':
      case 'shintoist':
      case 'sikh':
      case 'place_of_worship':
        f.properties.religion = f.properties.fclass
        break
      default:
        throw new Error(`osm_planet_pois_worship: ${f.properties.fclass}`)
    }
    delete f.properties['fclass']
    f.tippecanoe = {
    layer: 'poi',
    minzoom: 13,
    maxzoom: 15
    }
  return f
  },
  osm_planet_worship_area_p: f => {
    f.tippecanoe = {
      layer: 'worship',
      minzoom: 13,
      maxzoom: 15
    }
    f.properties._source = 'osm_planet_worship_area_p'
    return f
 },
  osm_planet_barrier_lines: f => {
    f.tippecanoe = {
      layer: 'nature',
      minzoom: 10,
      maxzoom: 15
    }
    return f
 },
  osm_planet_heritage_area_p: f => {
    f.tippecanoe = {
      layer: 'heritage',
      minzoom: 15,
      maxzoom: 15
    }
    return f 
},
  osm_planet_landuse_park_reserve: f => {
    f.tippecanoe = {
      layer: 'area_park',
      minzoom: 7,
      maxzoom: 15
    }
    return f 
},
  osm_planet_landuse_points: f => {
    f.tippecanoe = {
      layer: 'nature',
      minzoom: 10,
      maxzoom: 15
    }
    return f 
},
  osm_planet_other_area_p: f => {
    f.tippecanoe = {
      layer: 'otherarea',
      minzoom: 15,
      maxzoom: 15
    }
    f.properties._source = 'osm_planet_other_area_p'
    return f 
},
  osm_planet_places: f => {
    f.tippecanoe = {
      layer: 'place',
      minzoom: 7,
      maxzoom: 15
    }
    f.properties._source = 'osm_planet_places'
    return f 
},
  osm_planet_places_areas: f => {
    f.tippecanoe = {
      layer: 'place_a',
      minzoom: 10,
      maxzoom: 15
    }
    return f 
},
  osm_planet_public_area_p: f => {
    f.tippecanoe = {
      layer: 'public',
      minzoom: 11,
      maxzoom: 15
    }
    return f 
},
  osm_planet_transport_area_p: f => {
    f.tippecanoe = {
      layer: 'transareap',
      maxzoom: 15
    }
    switch (f.properties.z_order) {
      case 4:
        f.tippecanoe.minzoom = 7
        break
      default:
        f.tippecanoe.minzoom = 9
    }
    return f 
},
  osm_planet_services_area_p: f => {
    f.tippecanoe = {
      layer: 'serviceap',
      minzoom: 13,
      maxzoom: 15
    }
    return f 
},
  osm_planet_services_areas: f => {
    f.tippecanoe = {
      layer: 'service_a',
      minzoom: 13,
      maxzoom: 15
    }
    return f
  }
}
module.exports = (f) => {
  return postProcess(lut[f.properties._table](preProcess(f)))
}

