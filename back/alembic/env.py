"""Alembic environment: uses the app's DATABASE_URL and SQLModel models.

Create a migration after changing a model:   alembic revision --autogenerate -m "describe the change"
Apply migrations (also done on app startup): alembic upgrade head
"""
from logging.config import fileConfig

from alembic import context
from sqlmodel import SQLModel

import app.models  # noqa: F401  (registers every table on SQLModel.metadata)
from app.core.db import engine

config = context.config
if config.config_file_name is not None and config.attributes.get("configure_logger", True):
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata


def _configure(**kwargs):
    context.configure(
        target_metadata=target_metadata,
        # SQLite can't ALTER most things in place; batch mode recreates the table instead
        render_as_batch=engine.dialect.name == "sqlite",
        compare_type=True,
        **kwargs,
    )


def run_migrations_offline() -> None:
    _configure(url=str(engine.url), literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # Reuse a connection handed in by app startup, otherwise open one
    connection = config.attributes.get("connection")
    if connection is not None:
        _configure(connection=connection)
        with context.begin_transaction():
            context.run_migrations()
        return
    with engine.connect() as connection:
        _configure(connection=connection)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
