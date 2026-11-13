from services.supabase_client import get_supabase


ALLOWED_ROLES = {
    "student",
    "faculty",
    "admin",
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


def create_faculty_application(
    uid, email, name, faculty_branch, institution_id
):
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

    if institution_id is None:
        raise ValueError("Institution is required")

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
                "institution_id": institution_id,
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


def resolve_institution(code):
    """Resolve a valid institution for new registrations."""

    if not isinstance(code, str):
        raise ValueError("Institution code is required")

    code = code.strip()

    if not code or len(code) > 20:
        raise ValueError("Invalid institution code")

    result = (
        get_supabase()
        .table("institutions")
        .select("id,name,college_code,district,management")
        .eq("college_code", code)
        .eq("active", True)
        .eq("reviewed", True)
        .limit(1)
        .execute()
    )

    if not result.data:
        raise ValueError("Selected institution is not available")

    return result.data[0]


def serialize_profile(profile, institution=None):
    """Return one consistent profile representation."""

    if not profile:
        return None

    result = dict(profile)
    institution_id = result.get("institution_id")

    if institution_id is not None and institution is None:
        response = (
            get_supabase()
            .table("institutions")
            .select("id,name,college_code,district,management")
            .eq("id", institution_id)
            .limit(1)
            .execute()
        )

        institution = response.data[0] if response.data else None

    institution = institution or {}

    result["institution_name"] = institution.get("name")
    result["college_code"] = institution.get("college_code")
    result["district"] = institution.get("district")
    result["management"] = institution.get("management")

    result["institution"] = (
        {
            "id": institution.get("id"),
            "name": institution.get("name"),
            "college_code": institution.get("college_code"),
            "district": institution.get("district"),
            "management": institution.get("management"),
        }
        if institution else None
    )

    return result


def profile_integrity_issues(profile):
    """Identify missing or invalid required profile fields."""

    issues = []

    for field in ("firebase_uid", "full_name", "email"):
        value = profile.get(field)

        if not isinstance(value, str) or not value.strip():
            issues.append(field)

    role = profile.get("role")

    if role not in ALLOWED_ROLES:
        issues.append("role")

    if role in ("student", "faculty"):
        if profile.get("institution_id") is None:
            issues.append("institution_id")
        elif not profile.get("institution"):
            issues.append("institution_reference")

    if role == "faculty":
        branches = {
            "CSE", "ECE", "EEE", "MEC",
            "CIVIL", "AIML", "CCP"
        }

        if profile.get("faculty_branch") not in branches:
            issues.append("faculty_branch")

        if profile.get("approval_status") not in {
            "pending", "approved", "rejected"
        }:
            issues.append("approval_status")

    return issues


def get_complete_profile(uid):
    """Retrieve profile and institution in one database request."""

    result = (
        get_supabase()
        .table("profiles")
        .select(
            "*,institution:institutions("
            "id,name,college_code,district,management)"
        )
        .eq("firebase_uid", uid)
        .limit(1)
        .execute()
    )

    if not result.data:
        return None

    profile = dict(result.data[0])
    institution = profile.pop("institution", None)

    # An empty dictionary prevents a second lookup
    # when no related institution exists.
    return serialize_profile(
        profile,
        institution=institution or {},
    )
