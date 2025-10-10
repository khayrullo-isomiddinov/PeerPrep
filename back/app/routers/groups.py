from fastapi import APIRouter

router = APIRouter(prefix="/groups", tags=["groups"])

@router.get("")
def list_groups_placeholder():
    return []
