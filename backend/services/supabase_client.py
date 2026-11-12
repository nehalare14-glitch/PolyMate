import os
from functools import lru_cache
from supabase import create_client


@lru_cache(maxsize=1)
def get_supabase():
    url = os.getenv("SUPABASE_URL")
    key = (
        os.getenv("SUPABASE_SECRET_KEY")
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )

    if not url or not key:
        raise RuntimeError("Supabase server credentials missing")

    return create_client(url, key)
