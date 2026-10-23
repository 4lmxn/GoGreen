from types import SimpleNamespace
from app.services.evidence import evidence_for
from app.services.decision_policy import choose_route


def test_fuel_and_distance_domain_are_explicit():
    vehicle = SimpleNamespace(type='Van', fuel_type='Petrol')
    result = evidence_for({'distance_km': 600}, vehicle, 300, 'Formula fallback')
    assert result['within_documented_domain'] is False
    assert len(result['limitations']) == 2
    assert result['artifact_sha256'] is None


def test_supported_synthetic_domain_is_not_claimed_validated():
    result = evidence_for({'distance_km': 40}, SimpleNamespace(type='Van', fuel_type='Diesel'), 200, 'Formula fallback')
    assert result['within_documented_domain']
    assert result['confidence'] == 'Uncalibrated'
    assert result['truck_restrictions_verified'] is False


def test_unsupported_evidence_withholds_eco_ranking():
    candidates = [{'distance_km': 30, 'duration_min': 40}, {'distance_km': 25, 'duration_min': 44}]
    estimates = [{'predicted_co2_kg': c, 'evidence': {'within_documented_domain': False}} for c in (10, 5)]
    _, best, policy = choose_route(candidates, estimates)
    assert best == 0 and policy['eco_ranking_withheld']


def test_empty_feedback_has_no_invented_accuracy(client, admin_headers):
    report = client.get('/api/v1/admin/learning', headers=admin_headers)
    assert report.status_code == 200
    assert report.json['mae_l'] is None
    assert report.json['coverage_percent'] == 0
    assert report.json['automatic_retraining'] is False
    assert client.get('/api/v1/admin/learning').status_code == 401
