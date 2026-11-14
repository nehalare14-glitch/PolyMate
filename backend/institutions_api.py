import os
from functools import lru_cache
from threading import Lock
from time import monotonic
from collections import OrderedDict

from flask import Blueprint, jsonify, request
from supabase import create_client


institutions_bp = Blueprint("institutions", __name__)


CACHE_TTL = 300
CACHE_MAX_ENTRIES = 256

_institutions_cache = OrderedDict()
_cache_lock = Lock()


@lru_cache(maxsize=1)
def get_public_supabase():
    url = os.environ.get("SUPABASE_URL")

    key = (
        os.environ.get("SUPABASE_ANON_KEY")
        or os.environ.get("SUPABASE_PUBLISHABLE_KEY")
    )

    if not url or not key:
        raise RuntimeError(
            "Supabase configuration is missing"
        )

    return create_client(url, key)


def get_cached_institutions(district, management):
    cache_key = (district, management)
    now = monotonic()

    with _cache_lock:
        cached = _institutions_cache.get(cache_key)

        if cached is not None:
            expires_at, payload = cached

            if now < expires_at:
                _institutions_cache.move_to_end(cache_key)
                return payload

            _institutions_cache.pop(cache_key, None)

    return None


def cache_institutions(district, management, payload):
    cache_key = (district, management)

    with _cache_lock:
        _institutions_cache[cache_key] = (
            monotonic() + CACHE_TTL,
            payload,
        )

        _institutions_cache.move_to_end(cache_key)

        while len(_institutions_cache) > CACHE_MAX_ENTRIES:
            _institutions_cache.popitem(last=False)


@institutions_bp.get("/api/institutions")
def get_institutions():
    district = request.args.get("district", "").strip()
    management = request.args.get("management", "").strip()

    cached = get_cached_institutions(
        district,
        management,
    )

    if cached is not None:
        response = jsonify(cached)
        response.headers["X-PolyMate-Cache"] = "HIT"
        return response, 200

    try:
        try:
            client = get_public_supabase()

        except RuntimeError:
            return jsonify({
                "error": "Supabase configuration is missing"
            }), 503

        query = (
            client.table("institutions")
            .select("college_code,name,district,management")
            .eq("active", True)
        )

        if district:
            query = query.eq("district", district)

        if management:
            query = query.eq("management", management)

        result = query.order("name").limit(500).execute()

        payload = {
            "count": len(result.data),
            "institutions": result.data,
        }

        cache_institutions(
            district,
            management,
            payload,
        )

        response = jsonify(payload)
        response.headers["X-PolyMate-Cache"] = "MISS"

        return response, 200

    except Exception:
        return jsonify({
            "error": "Unable to load institutions"
        }), 500
