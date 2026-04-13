
# This file is intentionally cleared during PostgreSQL -> MongoDB migration.
# It is kept as a placeholder to prevent immediate ImportErrors in legacy files
# until they are fully refactored.

# Dummy get_db to satisfy imports during migration phase
async def get_db():
    raise NotImplementedError("SQL Database is disabled. Use MongoDB (await Model.find...).")

Base = object  # Dummy Base class
engine = None
SessionLocal = None
