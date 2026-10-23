from flask import Blueprint, request, jsonify, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db, limiter
from app.ml import physics
from app.models import User, UserRole, UserStatus, Driver, ApprovalStatus, Vehicle, VehicleStatus
from app.services.routing import coordinates, ProviderUnavailable
from app.services.rounds import plan_round, MAX_STOPS
from app.services.trip_workflow import number

rounds_bp = Blueprint('rounds', __name__)


@rounds_bp.errorhandler(ValueError)
def invalid(exc):
    return jsonify(message=str(exc)), 422


def round_vehicle(data):
    """Admins plan for any active vehicle; approved drivers plan for their own."""
    user = db.session.get(User, int(get_jwt_identity()))
    if not user or user.status != UserStatus.active:
        abort(403, description='Account is not active.')
    if user.role == UserRole.admin:
        vehicle_id = data.get('vehicle_id')
        if not isinstance(vehicle_id, int) or isinstance(vehicle_id, bool):
            raise ValueError('Choose a vehicle for this round.')
        vehicle = db.session.get(Vehicle, vehicle_id)
        if not vehicle:
            abort(404, description='Vehicle not found.')
        if vehicle.status != VehicleStatus.active:
            abort(409, description='This vehicle is not active.')
        return vehicle
    driver = Driver.query.filter_by(user_id=user.id).first()
    if user.role != UserRole.driver or not driver or driver.approval_status != ApprovalStatus.approved:
        abort(403, description='An approved driver account is required.')
    vehicle = Vehicle.query.filter_by(assigned_driver_id=driver.id, status=VehicleStatus.active).first()
    if not vehicle:
        abort(409, description='Ask your administrator to assign an active vehicle first.')
    return vehicle


def parse_stops(raw):
    if not isinstance(raw, list) or not 1 <= len(raw) <= MAX_STOPS:
        raise ValueError(f'Add between 1 and {MAX_STOPS} stops.')
    stops = []
    for i, item in enumerate(raw):
        if not isinstance(item, dict):
            raise ValueError('Each stop needs a place and a drop weight.')
        lat, lng = coordinates(item.get('place'))
        label = item.get('label') or f'Stop {i + 1}'
        if not isinstance(label, str) or len(label) > 60:
            raise ValueError('Stop labels must be text of at most 60 characters.')
        stops.append({'index': i, 'label': label.strip(), 'lat': lat, 'lng': lng,
                      'drop_kg': number(item.get('drop_kg', 0), 'Drop weight', 0, 100_000)})
    return stops


@rounds_bp.route('/plan', methods=['POST'])
@limiter.limit('20 per minute', override_defaults=True)
@jwt_required()
def plan():
    data = request.get_json() or {}
    vehicle = round_vehicle(data)
    vehicle_key = physics.vehicle_class(vehicle.type)
    fuel_key = physics.fuel_kind(vehicle.fuel_type, vehicle.type)
    if not vehicle_key or not fuel_key:
        return jsonify(message='This vehicle class or fuel has no physics profile yet. Use van, truck, heavy truck or car with diesel, petrol, CNG or electric.'), 409

    depot = coordinates(data.get('depot'))
    stops = parse_stops(data.get('stops'))
    places = [depot] + [(s['lat'], s['lng']) for s in stops]
    if len(set(places)) != len(places):
        raise ValueError('Depot and stops must all be different locations.')

    drops = sum(s['drop_kg'] for s in stops)
    start_load = number(data['start_load_kg'], 'Starting load') if data.get('start_load_kg') is not None else drops
    if start_load < drops:
        raise ValueError('Starting load must cover every drop on the round.')
    if start_load > (vehicle.load_capacity_kg or 0):
        return jsonify(message='Starting load exceeds the vehicle capacity.'), 409
    back = data.get('return_to_depot', True)
    if not isinstance(back, bool):
        raise ValueError('return_to_depot must be true or false.')

    try:
        from app.services.calibration import factor_and_uncertainty
        factor, _ = factor_and_uncertainty(vehicle.calibration)
        result = plan_round(depot, stops, vehicle_key, fuel_key, start_load, back, factor)
    except ProviderUnavailable as exc:
        return jsonify(message=str(exc)), 503
    return jsonify(vehicle={'id': vehicle.id, 'vehicle_no': vehicle.vehicle_no, 'class': vehicle_key,
                            'class_label': physics.PROFILES[vehicle_key]['label'], 'fuel': fuel_key},
                   depot={'lat': depot[0], 'lng': depot[1]}, stops=stops, **result)
