import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("learn_ai")


class ApiError(Exception):
    """Error with a stable machine code and a user-facing message."""

    def __init__(self, status: int, code: str, message: str, headers: dict[str, str] | None = None,
                 details: list[dict] | None = None):
        self.status = status
        self.code = code
        self.message = message
        self.headers = headers
        self.details = details  # optional [{field, message}] the web maps onto form fields


def _body(code: str, message: str, request: Request, details=None) -> dict:
    body = {"error": {"code": code, "message": message, "request_id": getattr(request.state, "request_id", None)}}
    if details is not None:
        body["error"]["details"] = details
    return body


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(request: Request, exc: ApiError):
        return JSONResponse(_body(exc.code, exc.message, request, exc.details), status_code=exc.status, headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        details = [
            {"field": ".".join(str(p) for p in e["loc"][1:]) or None, "message": e["msg"]} for e in exc.errors()
        ]
        return JSONResponse(_body("validation_error", "Some fields are invalid.", request, details), status_code=422)

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException):
        return JSONResponse(_body("http_error", str(exc.detail), request), status_code=exc.status_code)

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        log.exception("unhandled error", extra={"request_id": getattr(request.state, "request_id", None)})
        return JSONResponse(_body("internal_error", "Something went wrong. Please try again.", request), status_code=500)
