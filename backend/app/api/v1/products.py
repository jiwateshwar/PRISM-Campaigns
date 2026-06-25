from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate, ProductRead
from app.core.deps import require_viewer, require_admin
import uuid

router = APIRouter(prefix="/{operator_slug}/products", tags=["products"])


@router.get("", response_model=list[ProductRead])
async def list_products(
    operator_slug: str,
    active_only: bool = False,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    q = select(Product).where(Product.operator_id == operator.id, Product.deleted_at == None)
    if active_only:
        q = q.where(Product.is_active == True)
    q = q.order_by(Product.name)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=ProductRead, status_code=201)
async def create_product(
    operator_slug: str,
    payload: ProductCreate,
    auth=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    product = Product(operator_id=operator.id, **payload.model_dump())
    db.add(product)
    await db.flush()
    return product


@router.get("/{product_id}", response_model=ProductRead)
async def get_product(
    operator_slug: str,
    product_id: uuid.UUID,
    auth=Depends(require_viewer),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.operator_id == operator.id, Product.deleted_at == None)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=ProductRead)
async def update_product(
    operator_slug: str,
    product_id: uuid.UUID,
    payload: ProductUpdate,
    auth=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.operator_id == operator.id, Product.deleted_at == None)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(product, k, v)
    await db.flush()
    return product


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    operator_slug: str,
    product_id: uuid.UUID,
    auth=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    current_user, operator = auth
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.operator_id == operator.id, Product.deleted_at == None)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    from datetime import datetime, timezone
    product.deleted_at = datetime.now(timezone.utc)
    await db.flush()
