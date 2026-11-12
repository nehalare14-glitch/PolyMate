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

firebase_credentials_path = os.getenv("FIREBASE_CREDENTIALS")

if not firebase_credentials_path:
    raise RuntimeError("FIREBASE_CREDENTIALS is missing")

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

CORS(app, resources={
    r"/api/*": {
        "origins": [
            "http://localhost:3000",
            "http://127.0.0.1:3000"
        ],
        "allow_headers": [
            "Authorization",
            "Content-Type"
        ]
    }
})

@app.get("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "project": "PolyMate",
        "backend": "Python Flask",
        "firebase": "initialized"
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


from routes.ai import ai_bp

app.register_blueprint(ai_bp)


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False
    )














