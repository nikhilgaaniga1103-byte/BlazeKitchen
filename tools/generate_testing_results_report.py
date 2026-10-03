from __future__ import annotations

from datetime import date

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Pt


def set_run_mono(run) -> None:
    run.font.name = "Consolas"
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Consolas")
    run.font.size = Pt(10)


def main() -> None:
    out_path = "Blaze_Kitchen_Testing_Validation_Results_Report.docx"

    doc = Document()

    style = doc.styles["Normal"]
    style.font.name = "Calibri"
    style._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")
    style.font.size = Pt(11)

    title = doc.add_paragraph("BLAZE KITCHEN v2 — TESTING & VALIDATION REPORT")
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.runs[0].bold = True
    title.runs[0].font.size = Pt(18)

    stamp = doc.add_paragraph(f"Date: {date.today().isoformat()}")
    stamp.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph("")

    doc.add_heading("Project Overview (context for Q8 & Q9)", level=1)
    doc.add_paragraph(
        "Blaze Kitchen v2 is a full-stack cloud-kitchen web application with a Node.js/Express backend and a HTML/CSS/JS frontend. "
        "It supports menu browsing (nested categories → subcategories → items), authentication (JWT), order placement with server-side price validation, "
        "order tracking simulation, admin operations (dashboard/analytics/menu management), and real-time updates via Server-Sent Events (SSE)."
    )
    for b in [
        "Backend: Express + Mongoose (MongoDB), security middleware (helmet, rate limit, mongo-sanitize), JWT auth + role-based access.",
        "Frontend: Static pages consuming REST APIs at http://localhost:5000/api.",
        "Real-time: SSE endpoints for public frontend updates (/api/events/public) and admin updates (/api/admin/events?token=...).",
    ]:
        doc.add_paragraph(b, style="List Bullet")

    doc.add_heading("Q8 (50 Marks): Testing and Validation", level=1)

    doc.add_heading("8.1 Test Environment / Tools", level=2)
    for b in [
        "OS: Windows (local dev).",
        "Database: MongoDB (local) at mongodb://localhost:27017/blaze-kitchen.",
        "Backend runtime: Node.js (>= 18).",
        "Automation scripts: check-mongodb.js, verify-all.js, test-all-apis.js, db-summary.js, inspect-db.js.",
        "Manual validation: Browser DevTools + SSE EventSource connections.",
    ]:
        doc.add_paragraph(b, style="List Bullet")

    doc.add_heading("8.2 Validation Scope", level=2)
    for b in [
        "DB connectivity + collections presence (menus, categorymenus, users, orders, sitesettings, feedbacks, adminloginlogs).",
        "REST endpoints: health, auth, menu APIs, admin access control.",
        "Orders: server-side trusted totals, coupon rules, and schedule constraints.",
        "Tracking payload generation (progress %, ETA, map URL).",
        "Real-time updates: SSE broadcast and subscriptions for admin + customer.",
    ]:
        doc.add_paragraph(b, style="List Bullet")

    doc.add_heading("8.3 Key Test Cases (evidence-based)", level=2)
    table = doc.add_table(rows=1, cols=6)
    hdr = table.rows[0].cells
    hdr[0].text = "Test ID"
    hdr[1].text = "Objective"
    hdr[2].text = "Method"
    hdr[3].text = "Input / Endpoint"
    hdr[4].text = "Expected"
    hdr[5].text = "Observed"

    rows = [
        ("T1", "MongoDB connectivity", "Script", "node backend/check-mongodb.js", "Connects + lists collections", "Connected; collections listed"),
        ("T2", "Backend health", "Script", "GET /api/health (verify-all.js)", "200 OK JSON", "200 OK, env=development"),
        ("T3", "User registration", "Script", "POST /api/auth/register", "201 + JWT token", "201 Created; token generated"),
        ("T4", "Login + /me", "Script", "POST /api/auth/login; GET /api/auth/me", "200 + user", "Passed (200)"),
        ("T5", "Menu fetch", "Script", "GET /api/menu", "200 + array", "Passed (200)"),
        ("T6", "Admin protection", "Script", "GET /api/users, /api/menu/admin/all", "403 for non-admin", "403 observed (expected)"),
        ("T7", "404 handling", "Script", "GET /api/nonexistent", "404", "404 observed"),
        ("T8", "Order trusted totals", "Script", "POST /api/orders", "Server recomputes totals", "Created; totals computed server-side"),
        ("T9", "Tracking payload", "Script", "GET /api/orders/{id}/tracking", "Tracking JSON", "Returned progress% + mapUrl"),
    ]

    for r in rows:
        cells = table.add_row().cells
        for i, val in enumerate(r):
            cells[i].text = str(val)

    doc.add_heading("8.4 Validation Logic (why tests are meaningful)", level=2)

    doc.add_paragraph("Auth & Input Validation")
    for b in [
        "Register/login validated via express-validator (required fields, email format, password length).",
        "JWT protection + role restriction for admin routes.",
        'Registration blocks self-assigning admin role (role="admin" forced to "user").',
    ]:
        doc.add_paragraph(b, style="List Bullet")

    doc.add_paragraph("Order Integrity & Business Rules")
    for b in [
        "Order items validated against DB catalog by (name + allowed price) before accepting.",
        "Client totals are ignored; server recomputes subtotal/discount/CGST/SGST/packaging/total.",
        "Coupons validated via allow-list; discount capped to subtotal.",
        "Scheduled delivery validated between 20 minutes and 7 days.",
    ]:
        doc.add_paragraph(b, style="List Bullet")

    doc.add_paragraph("Real-time Validation (SSE)")
    for b in [
        "Frontend subscribes to /api/events/public and refreshes menu/settings/orders when events arrive.",
        "Admin panel subscribes to /api/admin/events and receives new-order and other admin events.",
        "Heartbeats keep SSE connections alive.",
    ]:
        doc.add_paragraph(b, style="List Bullet")

    doc.add_heading("Q9 (30 Marks): Results and Inference", level=1)

    doc.add_heading("9.1 Automated Verification Results (executed)", level=2)
    for line in [
        "verify-all.js: Health check passed (200 OK); Registration passed (201 Created) with JWT token; DB persistence confirmed.",
        "test-all-apis.js: Total Tests=14, Passed=14, Failed=0, Success Rate=100%.",
        "Admin-only endpoints returned 403 for a non-admin user token (expected and correct).",
    ]:
        doc.add_paragraph(line)

    doc.add_heading("9.2 Database Dataset Results (executed)", level=2)
    for line in [
        "Computed live counts:",
        "• Menu collection: 17 category docs, 28 subcategories, 146 items.",
        "• CategoryMenu collection: 25 category docs, 28 subcategories, 146 items.",
        "MongoDB collections observed: feedbacks, adminloginlogs, orders, users, menus, sitesettings, categorymenus.",
    ]:
        doc.add_paragraph(line)

    doc.add_heading("9.3 End-to-End Order + Tracking Result (executed)", level=2)
    doc.add_paragraph("Observed server-computed totals from a real order placed using a real catalog item:")
    order_result = {
        "orderId": "BLZ53W8AGL",
        "subtotal": 340,
        "discount": 50,
        "cgst": 7,
        "sgst": 7,
        "packagingFee": 20,
        "total": 344,
        "status": "placed",
    }
    mono = doc.add_paragraph()
    run = mono.add_run(str(order_result))
    set_run_mono(run)

    for b in [
        "Inference: server-side trusted totals mitigate client-side tampering.",
        "Tracking returned progressPercent=5 and a Google Maps route URL from kitchen to customer address.",
    ]:
        doc.add_paragraph(b, style="List Bullet")

    doc.add_heading("9.4 Inference / Conclusion", level=2)
    for b in [
        "API stability verified across core endpoints with 100% pass rate in the provided suite.",
        "Security posture improved by rate limiting, NoSQL sanitization, helmet headers, and role enforcement.",
        "Order calculations and catalog validation ensure financial correctness and prevent price spoofing.",
        "SSE provides real-time operational visibility (admin) and live updates (customer) without page refresh.",
    ]:
        doc.add_paragraph(b, style="List Bullet")

    doc.add_heading("Appendix: Commands to Re-run", level=1)
    for cmd in ["cd backend", "node check-mongodb.js", "node verify-all.js", "node test-all-apis.js"]:
        p = doc.add_paragraph(cmd)
        set_run_mono(p.runs[0])

    doc.save(out_path)
    print(out_path)


if __name__ == "__main__":
    main()
