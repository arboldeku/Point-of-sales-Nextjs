import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { hasPermission, logAudit } from '@/lib/permissions';

// Initialize Prisma client
const prisma = new PrismaClient();

// Handler function for POST request
export const POST = async (request: NextRequest) => {
  try {
    // Extract JWT token from Authorization header
    const token = request.headers.get('authorization')?.slice(7);

    if (!token) {
      return NextResponse.json(
        { error: 'Token no proporcionado', allowed: false },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido', allowed: false },
        { status: 401 }
      );
    }

    const body = await request.json();
    const userId = payload.userId;
    const userRole = payload.role;
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';

    // Check SELL_PRODUCT permission
    const canSell = await hasPermission(userRole, 'SELL_PRODUCT');
    if (!canSell) {
      await logAudit(
        userId,
        'SELL_PRODUCT',
        'Product',
        body.productId || null,
        'DENIED',
        { action: 'attempted_sale', product_id: body.productId },
        ipAddress
      );
      return NextResponse.json(
        { error: 'No tienes permiso para vender productos', allowed: false },
        { status: 403 }
      );
    }

    // Check APPLY_DISCOUNT_ON_SALE permission if discount is applied
    if (body.discount && body.discount > 0) {
      const canDiscount = await hasPermission(userRole, 'APPLY_DISCOUNT_ON_SALE');
      if (!canDiscount) {
        await logAudit(
          userId,
          'APPLY_DISCOUNT_ON_SALE',
          'Product',
          body.productId || null,
          'DENIED',
          { action: 'attempted_discount', product_id: body.productId, discount: body.discount },
          ipAddress
        );
        return NextResponse.json(
          { error: 'Solo administradores pueden aplicar descuentos', allowed: false },
          { status: 403 }
        );
      }
    }

    // Check if a product with the same productId and transactionId already exists
    const existingOrderProduct = await prisma.onSaleProduct.findFirst({
      where: {
        productId: body.productId,
        transactionId: body.transactionId,
      },
    });

    let onSaleProduct;

    if (existingOrderProduct) {
      // If it exists, update the quantity
      onSaleProduct = await prisma.onSaleProduct.update({
        where: {
          id: existingOrderProduct.id,
        },
        data: {
          quantity: existingOrderProduct.quantity + body.qTy,
        },
      });
    } else {
      // If it doesn't exist, create a new product
      onSaleProduct = await prisma.onSaleProduct.create({
        data: {
          transactionId: body.transactionId,
          productId: body.productId,
          quantity: body.qTy,
        },
      });
    }

    // Log successful sale
    await logAudit(
      userId,
      'SELL_PRODUCT',
      'Product',
      body.productId || null,
      'ALLOWED',
      { action: 'sale_completed', product_id: body.productId, quantity: body.qTy, discount: body.discount || 0 },
      ipAddress
    );

    // Return the created or updated product
    return NextResponse.json(onSaleProduct, { status: 201 });
  } catch (error: any) {
    // Handle errors
    return NextResponse.json({ error: error.message, allowed: false }, { status: 500 });
  } finally {
    // Disconnect Prisma client
    await prisma.$disconnect();
  }
};
