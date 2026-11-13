from routes.faculty_materials import faculty_materials_bp
from routes.student_materials import student_materials_bp

import os

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials

from routes.firebase_test import firebase_test_bp
from routes.auth import auth_bp
from routes.faculty_registration import faculty_registration_bp
from routes.role_dashboards import role_dashboards_bp

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

load_dotenv(
    dotenv_path=os.path.join(BASE_DIR, ".env")
)

firebase_credentials_path = os.getenv(
    "FIREBASE_CREDENTIALS"
)

if not firebase_credentials_path:
    raise RuntimeError("FIREBASE_CREDENTIALS is missing")

if not os.path.isabs(firebase_credentials_path):
    firebase_credentials_path = os.path.join(
        BASE_DIR, firebase_credentials_path
    )

if not os.path.isfile(firebase_credentials_path):
    raise RuntimeError("Firebase credentials file not found")

try:
    firebase_admin.get_app()
except ValueError:
    firebase_admin.initialize_app(
        credentials.Certificate(firebase_credentials_path)
    )

from institutions_api import institutions_bp
app = Flask(__name__)

app.register_blueprint(institutions_bp)

allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

production_origins = os.getenv("CORS_ORIGINS", "")

allowed_origins.extend(
    origin.strip().rstrip("/")
    for origin in production_origins.split(",")
    if origin.strip()
)

CORS(app, resources={
    r"/api/*": {
        "origins": allowed_origins,
        "allow_headers": [
            "Authorization",
            "Content-Type"
        ],
        "methods": [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
            "HEAD"
        ]
    }
})

@app.get("/api/health")
def health():

    registered_routes = {
        rule.rule: rule.methods
        for rule in app.url_map.iter_rules()
    }

    unread_summary = (
        "GET" in registered_routes.get(
            "/api/admin/community/unread-summary", set()
        )
    )

    unread_tickets = (
        "GET" in registered_routes.get(
            "/api/admin/community/unread-tickets", set()
        )
    )

    mark_read = (
        "PATCH" in registered_routes.get(
            "/api/admin/community/requests/<request_id>/read",
            set()
        )
    )

    return jsonify({
        "status": "ok",
        "project": "PolyMate",
        "backend": "Python Flask",
        "firebase": "initialized",
        "version": "phase-6-diagnostic-v1",
        "commit": os.getenv(
            "RENDER_GIT_COMMIT", "local"
        ),
        "features": {
            "community_unread_summary": unread_summary,
            "community_unread_tickets": unread_tickets,
            "community_mark_read": mark_read
        }
    })

app.register_blueprint(firebase_test_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(faculty_registration_bp)
app.register_blueprint(role_dashboards_bp)



app.register_blueprint(faculty_materials_bp)
app.register_blueprint(student_materials_bp)
from routes.student_bookmarks import student_bookmarks_bp
app.register_blueprint(student_bookmarks_bp)

from routes.admin_platform import admin_platform_bp
app.register_blueprint(admin_platform_bp)

from routes.admin_materials import admin_materials_bp
app.register_blueprint(admin_materials_bp)

from routes.admin_students import admin_students_bp
app.register_blueprint(admin_students_bp)

from routes.admin_analytics import admin_analytics_bp

app.register_blueprint(admin_analytics_bp)


from routes.admin_faculty import admin_faculty_bp

app.register_blueprint(admin_faculty_bp)





from routes.student_community import student_community_bp
app.register_blueprint(student_community_bp)

from routes.admin_community import admin_community_bp
app.register_blueprint(admin_community_bp)

from routes.community_messages import community_messages_bp
app.register_blueprint(community_messages_bp)

from routes.admin_email import admin_email_bp
app.register_blueprint(admin_email_bp)

from routes.community_email_jobs import community_email_jobs_bp

app.register_blueprint(community_email_jobs_bp)

from middleware.security import init_security

init_security(app)


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False
    )
