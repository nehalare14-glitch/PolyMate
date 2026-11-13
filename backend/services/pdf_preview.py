from io import BytesIO

from flask import send_file


def secure_pdf_response(db, bucket, material):
    pdf_bytes = db.storage.from_(bucket).download(
        material["storage_path"]
    )

    if not pdf_bytes or not pdf_bytes.startswith(b"%PDF-"):
        raise ValueError("Invalid PDF document")

    response = send_file(
        BytesIO(pdf_bytes),
        mimetype="application/pdf",
        as_attachment=False,
        download_name="document.pdf",
        conditional=False,
        max_age=0,
    )

    response.headers["Cache-Control"] = (
        "private, no-store, no-cache, "
        "must-revalidate, max-age=0"
    )

    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"

    return response
