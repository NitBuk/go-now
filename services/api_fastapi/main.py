"""FastAPI application entry point."""

from __future__ import annotations

import logging
import uuid

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from config import Config
from routers.public import router as public_router

logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format="%(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Go Now API",
    version="1.0.0",
    description="Tel Aviv Coast Buddy — hourly swim and run scores",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=Config.CORS_ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["Content-Type"],
    max_age=3600,
)


@app.middleware("http")
async def add_request_id(request: Request, call_next) -> Response:  # type: ignore[no-untyped-def]
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    response: Response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response


app.include_router(public_router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"service": "go-now-api", "version": "1.0.0"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=Config.PORT)
