import os

from flask import Blueprint, jsonify, request
from supabase import create_client

institutions_bp = Blueprint("institutions", __name__)


@institutions_bp.get("/api/institutions")
def get_institutions():
    try:
        url = os.environ.get("SUPABASE_URL")
        key = (
            os.environ.get("SUPABASE_ANON_KEY")
            or os.environ.get("SUPABASE_PUBLISHABLE_KEY")
        )

        if not url or not key:
            return jsonify({
                "error": "Supabase configuration is missing"
            }), 503

        client = create_client(url, key)

        query = (
            client.table("institutions")
            .select("college_code,name,district,management")
            .eq("active", True)
        )

        district = request.args.get("district", "").strip()
        management = request.args.get("management", "").strip()

        if district:
            query = query.eq("district", district)

        if management:
            query = query.eq("management", management)

        result = query.order("name").limit(500).execute()

        return jsonify({
            "count": len(result.data),
            "institutions": result.data
        }), 200

    except Exception:
        return jsonify({
            "error": "Unable to load institutions"
        }), 500


