r"""Local preview with explicitly labeled fixtures in a separate database.

From backend: ..\.venv\Scripts\python.exe -m scripts.run_demo
Never writes to instance/gogreen.db. Existing demo records are preserved.
"""
from datetime import timedelta
import bcrypt
from app import create_app, db
from app.models import User, UserRole, Driver, ApprovalStatus, Vehicle, Trip, TripStatus, TripPlan, Route
from app.services.trip_workflow import utcnow

app = create_app({'SQLALCHEMY_DATABASE_URI': 'sqlite:///preview.db', 'DEMO_MODE': True})


def seed():
    db.create_all()
    if User.query.count():
        return
    admin = User(name='Fleet Administrator', email='admin@demo.local', phone='9000000001', role=UserRole.admin,
                 password_hash=bcrypt.hashpw(b'DemoPass123!', bcrypt.gensalt()).decode())
    user = User(name='Aarav Mehta', email='driver@demo.local', phone='9000000002', role=UserRole.driver,
                password_hash=bcrypt.hashpw(b'DemoPass123!', bcrypt.gensalt()).decode())
    db.session.add_all([admin, user]); db.session.flush()
    driver = Driver(user_id=user.id, approval_status=ApprovalStatus.approved)
    db.session.add(driver); db.session.flush()
    vehicle = Vehicle(vehicle_no='KA-01-GG-2048', type='Van', fuel_type='Petrol', load_capacity_kg=1000, assigned_driver_id=driver.id)
    db.session.add(vehicle); db.session.flush()
    for day, count in enumerate([2, 3, 1, 4, 2, 3, 2]):
        for i in range(count):
            end = utcnow() - timedelta(days=6-day, minutes=i*80)
            trip = Trip(driver_id=driver.id, vehicle_id=vehicle.id, source='Bengaluru', destination='Hosur',
                        status=TripStatus.completed, start_time=end-timedelta(minutes=48), end_time=end,
                        load_weight_kg=300, purpose='Labeled demonstration fixture')
            db.session.add(trip); db.session.flush()
            route = Route(trip_id=trip.id, route_label='Demo route', distance_km=39.5, predicted_fuel_l=3.4,
                          predicted_co2_kg=8.0, eco_score=78, is_recommended=True)
            db.session.add(route); db.session.flush()
            candidate = {'id': route.id, 'title': 'Demo route', 'type': 'eco', 'distanceKm': 39.5,
                         'durationMin': 48, 'fuelLiters': 3.4, 'co2Kg': 8.0, 'ecoScore': 78,
                         'isAiRecommended': True, 'pathPoints': [], 'isFastest': False}
            db.session.add(TripPlan(trip_id=trip.id, candidates=[candidate], selected_route_id=route.id,
                                   baseline_co2_kg=9.5, prediction_mode='Demo fixture — not a measured journey', created_at=trip.start_time))
    db.session.commit()


if __name__ == '__main__':
    with app.app_context(): seed()
    print('DEMO ONLY: admin@demo.local / driver@demo.local; password: DemoPass123!')
    app.run(host='127.0.0.1', port=5002, threaded=True, debug=False)
