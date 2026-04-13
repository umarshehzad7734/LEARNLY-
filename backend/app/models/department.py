from beanie import Document
from pydantic import Field
from datetime import datetime, timezone


class Department(Document):
    name: str = Field(unique=True)
    color: str = "#4F46E5"  # Default hex color for chart
    total_semesters: int = Field(default=8, ge=1, le=12)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "departments"
        use_state_management = True
