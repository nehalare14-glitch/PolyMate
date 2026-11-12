from services.supabase_client import get_supabase


ALLOWED_ROLES = {
    "student",
    "faculty",
    "admin",
    "super_admin",
}


def get_profile(uid):
    result = (
        get_supabase()
        .table("profiles")
        .select("*")
        .eq("firebase_uid", uid)
        .limit(1)
        .execute()
    )

    return result.data[0] if result.data else None


def create_or_get_profile(uid, email, name=None, institution_id=None):
    if not uid or not email:
        raise ValueError("Firebase UID and email are required")

    # Ignore a duplicate UID rather than overwriting an existing role.
    get_supabase().table("profiles").upsert(
        {
            "firebase_uid": uid,
            "email": email,
            "full_name": name,
            "institution_id": institution_id,
            "role": "student",
        },
        on_conflict="firebase_uid",
        ignore_duplicates=True,
    ).execute()

    profile = get_profile(uid)

    if not profile:
        raise RuntimeError("Unable to retrieve profile")

    return profile


def list_profiles():
    client = get_supabase()
    profiles = []
    offset = 0
    page_size = 500

    while True:
        result = (
            client.table("profiles")
            .select("*")
            .order("created_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )

        batch = result.data or []
        profiles.extend(batch)

        if len(batch) < page_size:
            break

        offset += page_size

    return profiles


def update_role(uid, role):
    if role not in ALLOWED_ROLES:
        raise ValueError("Invalid role")

    result = (
        get_supabase()
        .table("profiles")
        .update({"role": role})
        .eq("firebase_uid", uid)
        .execute()
    )

    return result.data[0] if result.data else None


def create_faculty_application(uid, email, name, faculty_branch):
    """
    Create a pending faculty application.
    Never modify an existing user's role.
    """

    if not uid or not email:
        raise ValueError("Firebase UID and email are required")

    if not isinstance(name, str) or not 2 <= len(name.strip()) <= 80:
        raise ValueError("Name must contain 2 to 80 characters")

    allowed_branches = {
        "CSE", "ECE", "EEE", "MEC", "CIVIL", "AIML", "CCP"
    }

    if faculty_branch not in allowed_branches:
        raise ValueError("Invalid faculty branch")

    existing = get_profile(uid)

    if existing:
        if existing.get("role") != "faculty":
            raise ValueError(
                "This account already has a different role"
            )

        return existing

    result = (
        get_supabase()
        .table("profiles")
        .upsert(
            {
                "firebase_uid": uid,
                "email": email,
                "full_name": name.strip(),
                "role": "faculty",
                "faculty_branch": faculty_branch,
                "approval_status": "pending",
            },
            on_conflict="firebase_uid",
            ignore_duplicates=True,
        )
        .execute()
    )

    profile = get_profile(uid)

    if not profile:
        raise RuntimeError("Unable to create faculty application")

    if profile.get("role") != "faculty":
        raise ValueError(
            "This account already has a different role"
        )

    return profile




