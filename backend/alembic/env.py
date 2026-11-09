from logging.config import fileConfig

from alembic import context


from app.core.config import get_settings
from app.db.base import Base
import app.models  # noqa: F401  (registers all tables)

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)
config.set_main_option("sqlalchemy.url", get_settings().database_url.replace("%", "%%"))
target_metadata = Base.metadata

# Indexes created by hand in migrations (not representable in the models) — never autogenerate drops for them.
MANUAL_INDEXES = {"ix_knowledge_chunks_embedding"}


def include_object(obj, name, type_, reflected, compare_to):
    return not (type_ == "index" and name in MANUAL_INDEXES)


def run_migrations_offline() -> None:
    context.configure(url=config.get_main_option("sqlalchemy.url"), target_metadata=target_metadata,
                      literal_binds=True, render_as_batch=True, include_object=include_object)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    from app.db.session import engine as app_engine  # same TLS/connect settings as the app

    connectable = app_engine
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata,
                          render_as_batch=connection.dialect.name == "sqlite", include_object=include_object)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
