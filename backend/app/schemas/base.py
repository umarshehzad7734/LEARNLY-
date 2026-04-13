from typing import Annotated, Any
from beanie import PydanticObjectId
from pydantic import BeforeValidator

# Pydantic V2 compatible ObjectId type - forces everything to string immediately
# This avoids Pydantic's internal attempts to serialize the raw PydanticObjectId object.
PyObjectId = Annotated[
    str,
    BeforeValidator(lambda v: str(v)),
]
