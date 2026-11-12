from app import app
from firebase_admin import auth
from services.supabase_client import get_supabase

with app.app_context():

    email = "lalithalalitha73596@gmail.com"
    full_name = "Are Nehal"

    user = auth.get_user_by_email(email)

    print("\n===== FIREBASE ACCOUNT =====")
    print("Firebase UID:", user.uid)
    print("Email verified:", user.email_verified)

    if not user.email_verified:
        raise RuntimeError("Please verify your email first.")

    db = get_supabase()

    profile = (
        db.table("profiles")
        .select("firebase_uid,full_name,role,institution_id")
        .eq("firebase_uid", user.uid)
        .execute()
    )

    if not profile.data:
        raise RuntimeError("Student profile not found.")

    if profile.data[0]["role"] != "student":
        raise RuntimeError("This is not a student account.")

    print("\n===== FIND YOUR COLLEGE =====")

    search = input(
        "Enter your college name or college code: "
    ).strip()

    if not search:
        raise RuntimeError("College name or code is required.")

    query = (
        db.table("institutions")
        .select("id,college_code,name,district")
    )

    if search.isdigit():
        query = query.eq("college_code", search)
    else:
        query = query.ilike("name", f"%{search}%")

    colleges = query.limit(30).execute()

    if not colleges.data:
        raise RuntimeError("College not found.")

    for index, college in enumerate(colleges.data, 1):
        print(
            f"{index}. {college['name']} "
            f"| Code: {college['college_code']} "
            f"| District: {college['district']}"
        )

    selected = int(input("\nSelect your college number: "))

    if not 1 <= selected <= len(colleges.data):
        raise RuntimeError("Invalid college selection.")

    college = colleges.data[selected - 1]

    print("\n===== CONFIRM PROFILE =====")
    print("Full Name:", full_name)
    print("Email:", email)
    print("Institution:", college["name"])

    confirm = input("Type YES to save: ").strip()

    if confirm != "YES":
        print("Cancelled. No changes made.")

    else:
        result = (
            db.table("profiles")
            .update({
                "full_name": full_name,
                "institution_id": college["id"]
            })
            .eq("firebase_uid", user.uid)
            .eq("role", "student")
            .execute()
        )

        if not result.data:
            raise RuntimeError("Profile update failed.")

        auth.update_user(
            user.uid,
            display_name=full_name
        )

        print("\n===== PROFILE RESTORED SUCCESSFULLY =====")
        print("Full Name:", full_name)
        print("Institution:", college["name"])
        print("Email:", email)
        print("Role: Student")

