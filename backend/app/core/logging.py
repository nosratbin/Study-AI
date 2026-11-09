import logging
import re
import time
import uuid

from fastapi import FastAPI, Request

log = logging.getLogger("learn_ai")
_RID = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


def configure_logging(level: str = "INFO") -> None:
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(name)s %(message)s")


def install_request_logging(app: FastAPI) -> None:
    @app.middleware("http")
    async def _request_id(request: Request, call_next):
        incoming = request.headers.get("X-Request-ID", "")
        request_id = incoming if _RID.match(incoming) else uuid.uuid4().hex[:16]
        request.state.request_id = request_id
        start = time.perf_counter()
        response = await call_next(request)
        ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-ID"] = request_id
        # Never log bodies, tokens or query strings (may contain codes/PII).
        log.info("%s %s -> %s %.0fms rid=%s", request.method, request.url.path, response.status_code, ms, request_id)
        return response
