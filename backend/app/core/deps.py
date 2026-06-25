from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError
from app.db.session import get_db
from app.core.security import decode_token
from app.models.user import User, UserOperatorRole, UserRole
from app.models.operator import Operator
import uuid

bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalid or expired")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id), User.deleted_at == None))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


async def get_current_superadmin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_super_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin access required")
    return current_user


class OperatorAccess:
    """Dependency that validates the user can access a given operator and returns the operator."""

    def __init__(self, required_role: UserRole = UserRole.VIEWER):
        self.required_role = required_role

    async def __call__(
        self,
        operator_slug: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> tuple[User, Operator]:
        # Fetch operator
        result = await db.execute(
            select(Operator).where(Operator.slug == operator_slug, Operator.deleted_at == None)
        )
        operator = result.scalar_one_or_none()
        if not operator:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Operator not found")

        # Super admins bypass role checks
        if current_user.is_super_admin:
            return current_user, operator

        # Check user has access to this operator
        result = await db.execute(
            select(UserOperatorRole).where(
                UserOperatorRole.user_id == current_user.id,
                UserOperatorRole.operator_id == operator.id,
            )
        )
        role_record = result.scalar_one_or_none()
        if not role_record:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access to this operator")

        # Check role level
        role_hierarchy = {
            UserRole.VIEWER: 0,
            UserRole.PLANNER: 1,
            UserRole.OPERATOR_ADMIN: 2,
            UserRole.SUPER_ADMIN: 3,
        }
        if role_hierarchy.get(role_record.role, 0) < role_hierarchy.get(self.required_role, 0):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

        return current_user, operator


# Convenience instances
require_viewer = OperatorAccess(UserRole.VIEWER)
require_planner = OperatorAccess(UserRole.PLANNER)
require_admin = OperatorAccess(UserRole.OPERATOR_ADMIN)
