"""Cross-cutting HTTP behaviour: security headers, request size limit and safe error responses."""
import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger("peerprep")

# Event covers and study materials travel as base64 inside JSON, so allow generous bodies, but not unbounded
MAX_BODY_BYTES = 60 * 1024 * 1024

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
}
# The API only returns JSON; the interactive docs (development only) need their CDN assets
API_CSP = "default-src 'none'; frame-ancestors 'none'"
DOCS_PATHS = ("/docs", "/redoc", "/openapi.json")


def install(app: FastAPI, *, https: bool) -> None:
    @app.middleware("http")
    async def security_middleware(request: Request, call_next):
        length = request.headers.get("content-length")
        if length and length.isdigit() and int(length) > MAX_BODY_BYTES:
            return JSONResponse({"detail": "That upload is too large."}, status_code=413)

        response = await call_next(request)
        for name, value in SECURITY_HEADERS.items():
            response.headers.setdefault(name, value)
        if not request.url.path.startswith(DOCS_PATHS):
            response.headers.setdefault("Content-Security-Policy", API_CSP)
        if https:
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return response

    @app.exception_handler(Exception)
    async def unhandled_error(request: Request, exc: Exception):
        # Full details go to the server log only; the client gets a generic message
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse(
            {"detail": "Something went wrong on our side. Please try again in a moment."},
            status_code=500,
        )
