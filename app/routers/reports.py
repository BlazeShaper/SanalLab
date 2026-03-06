"""
/api/reports/* — Report builder endpoints.
"""
from __future__ import annotations
import datetime
import uuid

from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ReportItem
from app.session import ensure_session

router = APIRouter(prefix="/api/reports", tags=["reports"])


# ---- schemas ----------------------------------------------------------

class AddItemPayload(BaseModel):
    expression: str = "coulomb"
    label: str = "Coulomb's Law: F = k · (|q₁|·|q₂|) / r²"
    q1: float = 0.0
    q2: float = 0.0
    r: float = 1.0
    force: float = 0.0


class ReorderPayload(BaseModel):
    fromIndex: int
    toIndex: int


# ---- endpoints --------------------------------------------------------

@router.get("/items")
def list_items(request: Request, response: Response, db: Session = Depends(get_db)):
    sid = ensure_session(request, response)
    items = (
        db.query(ReportItem)
        .filter(ReportItem.session_id == sid)
        .order_by(ReportItem.order_index)
        .all()
    )
    return [_ser(it) for it in items]


@router.post("/items/add")
def add_item(payload: AddItemPayload, request: Request, response: Response, db: Session = Depends(get_db)):
    sid = ensure_session(request, response)

    count = db.query(ReportItem).filter(ReportItem.session_id == sid).count()

    item = ReportItem(
        id=str(uuid.uuid4()),
        session_id=sid,
        expression=payload.expression,
        label=payload.label,
        q1=payload.q1,
        q2=payload.q2,
        r=payload.r,
        force=payload.force,
        order_index=count,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _ser(item)


@router.post("/items/reorder")
def reorder_items(payload: ReorderPayload, request: Request, response: Response, db: Session = Depends(get_db)):
    sid = ensure_session(request, response)
    items = (
        db.query(ReportItem)
        .filter(ReportItem.session_id == sid)
        .order_by(ReportItem.order_index)
        .all()
    )
    if 0 <= payload.fromIndex < len(items) and 0 <= payload.toIndex < len(items):
        moved = items.pop(payload.fromIndex)
        items.insert(payload.toIndex, moved)
        for idx, it in enumerate(items):
            it.order_index = idx
        db.commit()
    return [_ser(it) for it in items]


@router.delete("/items/{item_id}")
def delete_item(item_id: str, request: Request, response: Response, db: Session = Depends(get_db)):
    sid = ensure_session(request, response)
    item = db.query(ReportItem).filter(ReportItem.id == item_id, ReportItem.session_id == sid).first()
    if item:
        db.delete(item)
        db.commit()
    return {"ok": True}


@router.get("/export/html", response_class=HTMLResponse)
def export_html(
    request: Request,
    response: Response,
    title: str = "İnteraktif Fizik Lab Raporu",
    lang: str = "tr",
    db: Session = Depends(get_db),
):
    sid = ensure_session(request, response)
    items = (
        db.query(ReportItem)
        .filter(ReportItem.session_id == sid)
        .order_by(ReportItem.order_index)
        .all()
    )

    rows = ""
    for idx, it in enumerate(items):
        rows += (
            f"<tr><td>{idx + 1}</td><td>{_esc(it.label)}</td>"
            f"<td>{it.q1:.1f} µC</td><td>{it.q2:.1f} µC</td>"
            f"<td>{it.r:.2f} m</td><td>{it.force:.3f} N</td>"
            f"<td>{it.created_at}</td></tr>\n"
        )

    # i18n labels for export
    _labels = {
        "tr": {
            "created_at": "Oluşturulma tarihi: ",
            "saved_expressions": "Kaydedilmiş İfadeler",
            "expression": "İfade",
            "timestamp": "Zaman Damgası",
            "no_items": "Kaydedilmiş öğe yok.",
            "hint": 'PDF olarak dışa aktar: Tarayıcı Yazdır → "PDF olarak Kaydet".',
        },
        "en": {
            "created_at": "Created at: ",
            "saved_expressions": "Saved Expressions",
            "expression": "Expression",
            "timestamp": "Timestamp",
            "no_items": "No items saved.",
            "hint": 'Export as PDF: Browser Print → "Save as PDF".',
        },
    }
    lb = _labels.get(lang, _labels["tr"])

    if not rows:
        rows = f'<tr><td colspan="7">{lb["no_items"]}</td></tr>'

    created = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    html = f"""<!doctype html>
<html lang="{lang}"><head><meta charset="utf-8"/><title>{_esc(title)}</title>
<style>
body{{font-family:Arial,sans-serif;margin:24px;color:#111}}
h1{{margin:0 0 8px}}
.meta{{color:#555;margin-bottom:16px;font-size:13px}}
table{{width:100%;border-collapse:collapse;margin-top:12px}}
th,td{{border:1px solid #ddd;padding:8px;font-size:13px;vertical-align:top}}
th{{background:#f5f5f5;text-align:left}}
.hint{{margin-top:16px;color:#666;font-size:12px}}
</style></head><body>
<h1>{_esc(title)}</h1>
<div class="meta">{lb['created_at']}{created}</div>
<h2>{lb['saved_expressions']}</h2>
<table><thead><tr><th>#</th><th>{lb['expression']}</th><th>q1</th><th>q2</th><th>r</th><th>F</th><th>{lb['timestamp']}</th></tr></thead>
<tbody>{rows}</tbody></table>
<div class="hint">{lb['hint']}</div>
</body></html>"""

    # Build a safe ASCII filename + RFC 6266 UTF-8 encoded filename
    from urllib.parse import quote
    safe_title = title.replace(" ", "_")
    ascii_fallback = "report.html"
    utf8_filename = quote(safe_title + ".html", safe="")
    content_disp = (
        f'attachment; filename="{ascii_fallback}"; '
        f"filename*=UTF-8''{utf8_filename}"
    )

    return HTMLResponse(content=html, headers={
        "Content-Disposition": content_disp
    })


@router.get("/export/json")
def export_json(request: Request, response: Response, db: Session = Depends(get_db)):
    sid = ensure_session(request, response)
    items = (
        db.query(ReportItem)
        .filter(ReportItem.session_id == sid)
        .order_by(ReportItem.order_index)
        .all()
    )
    return JSONResponse(content=[_ser(it) for it in items])


# ---- helpers ----------------------------------------------------------

def _ser(item: ReportItem) -> dict:
    return {
        "id": item.id,
        "expression": item.expression,
        "label": item.label,
        "q1": item.q1,
        "q2": item.q2,
        "r": item.r,
        "force": item.force,
        "order_index": item.order_index,
        "created_at": str(item.created_at),
    }


def _esc(s: str) -> str:
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
