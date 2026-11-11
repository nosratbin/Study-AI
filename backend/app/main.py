from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    admin,
    admin_care,
    admin_users,
    ai,
    assessments,
    auth,
    careers,
    courses,
    google,
    mindcare,
    notifications,
    opportunities,
    planner,
    projects,
    public,
    skills,
    students,
    teacher,
)
from app.core.config import get_settings
from app.core.errors import install_error_handlers
from app.core.logging import configure_logging, install_request_logging


def create_app() -> FastAPI:
    s = get_settings()
    configure_logging("WARNING" if s.environment == "test" else "INFO")
    app = FastAPI(
        title=s.app_name,
        version="0.1.0",
        description="IccheGhuri — national AI education & student development platform (MVP).",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        redoc_url=None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=s.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Client-Type", "X-Request-ID"],
    )
    install_request_logging(app)
    install_error_handlers(app)

    for r in (public.router, auth.router, students.router, courses.router, assessments.router, ai.router,
              opportunities.router, google.router, admin.router, projects.router, skills.router, skills.public_router,
              mindcare.router, planner.router, admin_care.router, notifications.router, teacher.router, admin_users.router,
              careers.router):
        app.include_router(r, prefix=s.api_prefix)
    return app


app = create_app()
