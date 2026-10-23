import math
from datetime import datetime, timezone
from app.ml.predict import predict_trip_metrics


def number(value, label, minimum=0, maximum=1_000_000):
    try:
        if isinstance(value, bool):
            raise ValueError()
        value = float(value)
        if not math.isfinite(value) or not minimum <= value <= maximum:
            raise ValueError()
        return value
    except (ValueError, TypeError):
        raise ValueError(f'{label} must be a number between {minimum} and {maximum}.')


def iso(value):
    return value.replace(tzinfo=timezone.utc).isoformat() if value else None


def estimate(route, vehicle, load):
    # The existing model was trained on synthetic data with categorical weather
    # and traffic. Fixed inputs are explicit assumptions, never live observations.
    metrics = predict_trip_metrics(route['distance_km'], load, 'Medium', 'Clear', vehicle.type)
    from app.ml.predict import _models
    mode = 'Synthetic-trained Random Forest' if 'co2' in _models else 'Formula fallback'
    from app.services.evidence import evidence_for
    return {**metrics, 'prediction_mode': mode, 'evidence': evidence_for(route, vehicle, load, mode)}


def selected(trip):
    if not trip.plan:
        return None
    return next((r for r in trip.plan.candidates if r['id'] == trip.plan.selected_route_id), None)


def serialize(trip):
    route = selected(trip)
    plan = trip.plan
    from app.models import TripLog
    last = TripLog.query.filter_by(trip_id=trip.id).order_by(TripLog.timestamp.desc()).first()
    comparable = route and not route.get('decisionPolicy', {}).get('eco_ranking_withheld', False)
    saved = plan.baseline_co2_kg - route['co2Kg'] if plan and comparable else None
    return {
        'id': trip.id, 'tripId': trip.id, 'origin': trip.source, 'destination': trip.destination,
        'status': trip.status.value, 'driverName': trip.driver.user.name,
        'vehicleId': trip.vehicle.vehicle_no, 'loadWeight': trip.load_weight_kg,
        'startedAt': iso(trip.start_time), 'completedAt': iso(trip.end_time),
        'createdAt': iso(plan.created_at) if plan else None,
        'routes': plan.candidates if plan else [],
        'selectedRouteId': plan.selected_route_id if plan else None,
        'selectedRoute': route,
        'estimatedSavingsKg': round(saved, 2) if saved is not None else None,
        'predictionMode': plan.prediction_mode if plan else 'Legacy record — no saved prediction',
        'actualFuelLiters': trip.actual_fuel_l, 'actualCo2Kg': trip.actual_co2_kg,
        'fuelPredictionErrorLiters': round(trip.actual_fuel_l - route['fuelLiters'], 3)
        if route and trip.actual_fuel_l is not None else None,
        'measurementSource': 'Driver-reported; not independently verified' if trip.actual_fuel_l is not None else 'Not recorded',
        'lastLocation': {'lat': last.lat, 'lng': last.lng, 'timestamp': iso(last.timestamp)} if last else None,
    }


def utcnow():
    return datetime.now(timezone.utc)
