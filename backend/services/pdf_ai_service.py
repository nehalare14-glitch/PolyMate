from io import BytesIO

from pypdf import PdfReader

from services.supabase_client import get_supabase


CHUNK_SIZE = 900
CHUNK_OVERLAP = 120
MAX_PAGES = 200
MAX_CHUNKS = 1000


def split_text(text):
    text = " ".join(text.split())

    if not text:
        return []

    chunks = []
    start = 0

    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))

        if end < len(text):
            boundary = text.rfind(" ", start, end)

            if boundary > start + 400:
                end = boundary

        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end >= len(text):
            break

        start = max(start + 1, end - CHUNK_OVERLAP)

    return chunks


def extract_pdf_chunks(pdf_bytes):
    reader = PdfReader(BytesIO(pdf_bytes))

    if reader.is_encrypted:
        raise ValueError("Encrypted PDFs are not supported")

    rows = []

    for page_index, page in enumerate(reader.pages):

        if page_index >= MAX_PAGES:
            break

        text = page.extract_text() or ""

        for chunk_index, chunk in enumerate(split_text(text)):

            rows.append({
                "page_number": page_index + 1,
                "chunk_index": chunk_index,
                "content": chunk
            })

            if len(rows) >= MAX_CHUNKS:
                return rows

    return rows


def index_material(material_id, storage_path, pdf_bytes):
    chunks = extract_pdf_chunks(pdf_bytes)

    if not chunks:
        return {
            "status": "no_text",
            "chunks": 0
        }

    db = get_supabase()

    rows = [
        {
            "material_id": str(material_id),
            "storage_path": storage_path,
            **chunk
        }
        for chunk in chunks
    ]

    for start in range(0, len(rows), 100):

        db.table("material_chunks").upsert(
            rows[start:start + 100],
            on_conflict=(
                "material_id,storage_path,"
                "page_number,chunk_index"
            )
        ).execute()

    return {
        "status": "indexed",
        "chunks": len(rows)
    }


def search_materials(question, uid, role, limit=3):

    if role not in {"student", "faculty"}:
        raise ValueError("Invalid AI role")

    result = get_supabase().rpc(
        "search_material_chunks",
        {
            "search_query": question,
            "requester_uid": uid,
            "requester_role": role,
            "match_count": limit
        }
    ).execute()

    return result.data or []
