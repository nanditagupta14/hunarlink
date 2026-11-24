from fastapi import APIRouter
from app.modules.users.router import router as users_router
from app.modules.sellers.router import router as sellers_router
from app.modules.suppliers.router import router as suppliers_router
from app.modules.dealers.router import router as dealers_router
from app.modules.procurement.router import router as procurement_router
from app.modules.products.router import router as products_router
from app.modules.retail_orders.router import router as retail_router
from app.modules.wholesale.router import router as wholesale_router
from app.modules.payments.router import router as payments_router
from app.modules.admin.router import router as admin_router

api_v1_router = APIRouter()

api_v1_router.include_router(users_router)
api_v1_router.include_router(sellers_router)
api_v1_router.include_router(suppliers_router)
api_v1_router.include_router(dealers_router)
api_v1_router.include_router(procurement_router)
api_v1_router.include_router(products_router)
api_v1_router.include_router(retail_router)
api_v1_router.include_router(wholesale_router)
api_v1_router.include_router(payments_router)
api_v1_router.include_router(admin_router)

