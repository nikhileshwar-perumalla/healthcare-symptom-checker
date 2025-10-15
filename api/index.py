"""Vercel entrypoint for FastAPI app.
This file exposes `app` for the @vercel/python runtime.
"""

from backend.main import app  # noqa: F401
