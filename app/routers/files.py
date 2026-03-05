"""
/api/files/* — File upload, list, download, and sharing endpoints.
"""
import os
import uuid

from fastapi import APIRouter, Depends, File, Request, Response, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import UploadedFile
from app.session import ensure_session

router = APIRouter(tags=["files"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_MIMES = {
    "image/png", "image/jpeg", "image/gif", "image/webp",
    "application/pdf",
    "text/plain", "text/csv",
    "application/json",
    "application/octet-stream",
}
MAX_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/api/files/upload")
async def upload_file(
    request: Request,
    response: Response,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    sid = ensure_session(request, response)

    # Validate mime type
    mime = file.content_type or "application/octet-stream"
    if mime not in ALLOWED_MIMES:
        return {"error": f"File type {mime} not allowed."}

    # Read content with size cap
    content = await file.read()
    if len(content) > MAX_SIZE:
        return {"error": "File too large (max 10 MB)."}

    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename or "file")[1]
    safe_name = file_id + ext
    dest = os.path.join(UPLOAD_DIR, safe_name)

    with open(dest, "wb") as f:
        f.write(content)

    record = UploadedFile(
        id=file_id,
        session_id=sid,
        original_name=file.filename or "file",
        mime_type=mime,
        size=len(content),
        path=safe_name,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return _ser(record)


@router.get("/api/files")
def list_files(request: Request, response: Response, db: Session = Depends(get_db)):
    sid = ensure_session(request, response)
    files = db.query(UploadedFile).filter(UploadedFile.session_id == sid).order_by(UploadedFile.created_at.desc()).all()
    return [_ser(f) for f in files]


@router.get("/api/files/{file_id}")
def get_file(file_id: str, request: Request, response: Response, db: Session = Depends(get_db)):
    sid = ensure_session(request, response)
    rec = db.query(UploadedFile).filter(UploadedFile.id == file_id, UploadedFile.session_id == sid).first()
    if not rec:
        return {"error": "not_found"}
    full_path = os.path.join(UPLOAD_DIR, rec.path)
    if not os.path.isfile(full_path):
        return {"error": "file_missing"}
    return FileResponse(full_path, media_type=rec.mime_type, filename=rec.original_name)


@router.post("/api/files/{file_id}/share")
def share_file(file_id: str, request: Request, response: Response, db: Session = Depends(get_db)):
    sid = ensure_session(request, response)
    rec = db.query(UploadedFile).filter(UploadedFile.id == file_id, UploadedFile.session_id == sid).first()
    if not rec:
        return {"error": "not_found"}
    if not rec.public_token:
        rec.public_token = str(uuid.uuid4())
        rec.is_public = True
        db.commit()
        db.refresh(rec)
    return {"public_url": f"/public/files/{rec.public_token}"}


@router.get("/public/files/{token}")
def public_file(token: str, db: Session = Depends(get_db)):
    rec = db.query(UploadedFile).filter(UploadedFile.public_token == token, UploadedFile.is_public == True).first()
    if not rec:
        return {"error": "not_found"}
    full_path = os.path.join(UPLOAD_DIR, rec.path)
    if not os.path.isfile(full_path):
        return {"error": "file_missing"}
    return FileResponse(full_path, media_type=rec.mime_type, filename=rec.original_name)


def _ser(rec: UploadedFile) -> dict:
    return {
        "id": rec.id,
        "original_name": rec.original_name,
        "mime_type": rec.mime_type,
        "size": rec.size,
        "is_public": rec.is_public,
        "public_token": rec.public_token,
        "created_at": str(rec.created_at),
    }
