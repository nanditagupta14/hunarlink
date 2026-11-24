from typing import List
from fastapi import Depends
from app.core.exceptions import PermissionDenied
from app.core.security import get_current_user
from app.models.all_models import User

def require_role(allowed_roles: List[str]):
    def role_checker(user: User = Depends(get_current_user)) -> User:
        user_roles = [r.role.lower() for r in user.roles]
        # Admin can access everything
        if "admin" in user_roles:
            return user
        for role in allowed_roles:
            if role.lower() in user_roles:
                return user
        raise PermissionDenied(f"Access restricted to roles: {', '.join(allowed_roles)}")
    return role_checker

def require_admin(user: User = Depends(get_current_user)) -> User:
    return require_role(["admin"])(user)

def require_seller(user: User = Depends(get_current_user)) -> User:
    return require_role(["seller", "admin"])(user)

def require_supplier(user: User = Depends(get_current_user)) -> User:
    return require_role(["supplier", "admin"])(user)

def require_dealer(user: User = Depends(get_current_user)) -> User:
    return require_role(["dealer", "admin"])(user)

