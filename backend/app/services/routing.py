"""Road alternatives from OSRM. No invented traffic or weather observations."""
import math
import os
import requests

CITIES = {
    'bengaluru': (12.9716, 77.5946), 'bangalore': (12.9716, 77.5946),
    'mysuru': (12.2958, 76.6394), 'mysore': (12.2958, 76.6394),
    'chennai': (13.0827, 80.2707), 'mumbai': (19.0760, 72.8777),
    'delhi': (28.6139, 77.2090), 'pune': (18.5204, 73.8567),
    'hyderabad': (17.3850, 78.4867), 'hosur': (12.7409, 77.8253),
    'tumakuru': (13.3379, 77.1173), 'kochi': (9.9312, 76.2673),
}


class ProviderUnavailable(Exception):
    pass


def coordinates(place):
    if not isinstance(place, str) or len(place) > 255:
        raise ValueError('Enter a supported city or latitude,longitude.')
    key = place.strip().lower()
    if key in CITIES:
        return CITIES[key]
    try:
        lat, lng = map(float, key.split(','))
        if math.isfinite(lat) and math.isfinite(lng) and -90 <= lat <= 90 and -180 <= lng <= 180:
            return lat, lng
    except (ValueError, TypeError):
        pass
    raise ValueError('Location not recognized. Choose a listed city or enter latitude,longitude.')


def get_road_routes(source, destination):
    start, end = coordinates(source), coordinates(destination)
    if start == end:
        raise ValueError('Origin and destination must be different.')
    base = os.environ.get('OSRM_BASE_URL', 'https://router.project-osrm.org').rstrip('/')
    path = f'{start[1]},{start[0]};{end[1]},{end[0]}'
    try:
        response = requests.get(f'{base}/route/v1/driving/{path}', params={
            'alternatives': 'true', 'overview': 'simplified', 'geometries': 'geojson'
        }, timeout=(5, 20))
        response.raise_for_status()
        data = response.json()
        if data.get('code') != 'Ok' or not data.get('routes'):
            raise ProviderUnavailable('No drivable route returned. Try different locations.')
        result = []
        for route in data['routes'][:3]:
            distance = float(route['distance']) / 1000
            duration = float(route['duration']) / 60
            points = [[float(lat), float(lng)] for lng, lat in route['geometry']['coordinates']]
            if not (math.isfinite(distance) and math.isfinite(duration) and distance > 0 and duration > 0 and len(points) >= 2):
                raise ValueError('Invalid provider route')
            result.append({'distance_km': distance, 'duration_min': duration, 'pathPoints': points})
        return result
    except (requests.RequestException, ValueError, KeyError, TypeError) as exc:
        raise ProviderUnavailable('Routing service unavailable. Nothing was saved; please retry.') from exc
