"""Applies Alembic migrations on startup, so every deploy brings the database schema up to date."""
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlmodel import SQLModel

import app.models  # noqa: F401  (registers every table on SQLModel.metadata)
from app.core.db import engine

BACK_DIR = Path(__file__).resolve().parents[2]
BASELINE_REVISION = "0001"


def run_migrations() -> None:
    config = Config(str(BACK_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACK_DIR / "alembic"))
    config.attributes["configure_logger"] = False  # keep the app's logging setup

    with engine.begin() as connection:
        config.attributes["connection"] = connection
        tables = set(inspect(connection).get_table_names())
        if "alembic_version" not in tables and "user" in tables:
            # Database created by the old create_all() startup, before migrations existed.
            # Make sure every baseline table exists, then record that it's at the baseline.
            SQLModel.metadata.create_all(connection)
            command.stamp(config, BASELINE_REVISION)
        command.upgrade(config, "head")
