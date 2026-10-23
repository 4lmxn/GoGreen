# Connected workflow preview

Run backend from backend/: `../.venv/Scripts/python.exe -m scripts.run_demo` with CORS_ORIGINS=http://127.0.0.1:5175.
Run frontend with VITE_API_BASE_URL=http://127.0.0.1:5002/api/v1 and `npm run dev -- --host 127.0.0.1 --port 5175 --strictPort`.

Preview: http://127.0.0.1:5175/login
Demo accounts: admin@demo.local and driver@demo.local. Password: DemoPass123!
Sample history is labeled and isolated in backend/instance/preview.db. The original database is preserved.

For the original database, run `../.venv/Scripts/python.exe -m flask --app run init-db` from backend before starting run.py. This adds missing tables without removing existing records. Back up your database before deployment.

Implemented: persisted plans and selected routes, ownership checks, constrained recommendations, start/end/cancel states, GPS upload, fleet polling, database-backed dashboards, and authenticated exports.

Validation: 28 backend tests pass; frontend production build passes. OSRM returned two real Bengaluru-Hosur alternatives. GPS permission and actual mobile-device tracking still need device testing. Public routing requires network access; blocked requests return a visible failure rather than simulated success. Existing model artifacts with incompatible scikit-learn versions use a labeled fallback. No measured-data model training has been performed. This remains a local development prototype, not a production-certified system.
