from fastapi import HTTPException, status

class HunarLinkException(HTTPException):
    def __init__(self, detail: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail=detail)

class ResourceNotFound(HunarLinkException):
    def __init__(self, resource_name: str, resource_id: str):
        super().__init__(
            detail=f"{resource_name} with identifier '{resource_id}' was not found.",
            status_code=status.HTTP_404_NOT_FOUND
        )

class PermissionDenied(HunarLinkException):
    def __init__(self, detail: str = "You do not have permission to perform this action."):
        super().__init__(detail=detail, status_code=status.HTTP_403_FORBIDDEN)

class AuthenticationRequired(HunarLinkException):
    def __init__(self, detail: str = "Valid authentication credentials are required."):
        super().__init__(detail=detail, status_code=status.HTTP_401_UNAUTHORIZED)

