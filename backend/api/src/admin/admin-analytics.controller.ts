import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('v1/admin/analytics')
@UseGuards(JwtGuard)
export class AdminAnalyticsController {
  constructor(private prisma: PrismaService) {}

  private checkAdminRole(req: any) {
    const user = (req as { user?: { role: string } })?.user;
    if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
      throw new UnauthorizedException('Admin access required');
    }
  }

  @Get('dashboard')
  async getDashboard(@Req() req: any) {
    this.checkAdminRole(req);

    // Общая статистика
    const totalOrders = await this.prisma.order.count();
    const totalRevenue = await this.prisma.order.aggregate({
      _sum: { totalAmount: true },
    });

    // Заказы по статусам
    const ordersByStatus = await this.prisma.order.groupBy({
      by: ['status'],
      _count: true,
    });

    // Продажи за последние 7 дней
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOrders = await this.prisma.order.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { totalAmount: true, createdAt: true },
    });

    // Топ товаров по продажам
    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId', 'title'],
      _sum: { qty: true, amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    const totalRevenueTodayResult = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
      select: { totalAmount: true },
    });

    const totalRevenueToday = totalRevenueTodayResult.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0,
    );

    return {
      overview: {
        totalOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        totalRevenueToday: totalRevenueToday,
        averageOrderValue:
          totalOrders > 0
            ? (totalRevenue._sum.totalAmount || 0) / totalOrders
            : 0,
      },
      ordersByStatus,
      recentOrders: recentOrders.map((o) => ({
        amount: o.totalAmount || 0,
        date: o.createdAt,
      })),
      topProducts,
    };
  }

  @Get('orders-stats')
  async getOrdersStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Req() req?: any,
  ) {
    this.checkAdminRole(req);

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        totalAmount: true,
        status: true,
      },
    });

    // Группируем по дням
    const ordersByDate: Record<string, any> = {};
    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!ordersByDate[date]) {
        ordersByDate[date] = {
          count: 0,
          revenue: 0,
          orders: [],
        };
      }
      const orderData = ordersByDate[date] as {
        count: number;
        revenue: number;
        orders: any[];
      };
      orderData.count++;
      orderData.revenue += order.totalAmount || 0;
      orderData.orders.push(order);
    });

    return {
      period: { start, end },
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      byDate: ordersByDate,
    };
  }

  @Get('products-sales')
  async getProductsSales(
    @Query('limit') limit: string = '20',
    @Req() req?: any,
  ) {
    this.checkAdminRole(req);

    const sales = await this.prisma.orderItem.groupBy({
      by: ['productId', 'title'],
      _sum: { qty: true, amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: parseInt(limit),
    });

    return {
      data: sales.map((item) => ({
        productId: item.productId,
        title: item.title,
        totalSold: item._sum.qty,
        totalRevenue: item._sum.amount || 0,
        ordersCount: item._count.id,
      })),
    };
  }

  @Get('revenue-analytics')
  async getRevenueAnalytics(
    @Query('period') period: string = 'month', // day, week, month, year
    @Req() req?: any,
  ) {
    this.checkAdminRole(req);

    let daysBack = 30;

    switch (period) {
      case 'week':
        daysBack = 7;
        break;
      case 'month':
        daysBack = 30;
        break;
      case 'year':
        daysBack = 365;
        break;
    }

    const start = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start },
      },
      select: {
        createdAt: true,
        totalAmount: true,
      },
    });

    // Группируем по дням
    const revenueByDate: Record<string, number> = {};
    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      revenueByDate[date] =
        (revenueByDate[date] || 0) + (order.totalAmount || 0);
    });

    return {
      period,
      data: Object.entries(revenueByDate).map(([date, revenue]) => ({
        date,
        revenue,
      })),
    };
  }

  @Get('write-offs-stats')
  async getWriteOffsStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Req() req?: any,
  ) {
    this.checkAdminRole(req);

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Получаем списания
    const writeOffs = await this.prisma.writeOff.findMany({
      where,
      include: {
        batch: {
          select: { purchasePrice: true, productId: true },
        },
      },
    });

    const totalQuantity = writeOffs.reduce((sum, w) => sum + w.quantity, 0);
    const totalValue = writeOffs.reduce(
      (sum, w) => sum + w.quantity * w.batch.purchasePrice,
      0,
    );

    // Группировка по товарам
    const byProduct: Record<string, { quantity: number; value: number }> = {};
    for (const wo of writeOffs) {
      const pid = wo.batch.productId;
      if (!byProduct[pid]) {
        byProduct[pid] = { quantity: 0, value: 0 };
      }
      byProduct[pid].quantity += wo.quantity;
      byProduct[pid].value += wo.quantity * wo.batch.purchasePrice;
    }

    // Получаем названия товаров
    const productIds = Object.keys(byProduct);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p.title]));

    const byProductList = Object.entries(byProduct)
      .map(([productId, data]) => ({
        productId,
        productTitle: productMap.get(productId) || 'Неизвестный товар',
        quantity: data.quantity,
        value: data.value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Группировка по дням
    const byDate: Record<string, { quantity: number; value: number }> = {};
    for (const wo of writeOffs) {
      const date = wo.createdAt.toISOString().split('T')[0];
      if (!byDate[date]) {
        byDate[date] = { quantity: 0, value: 0 };
      }
      byDate[date].quantity += wo.quantity;
      byDate[date].value += wo.quantity * wo.batch.purchasePrice;
    }

    // Партии с истекающим сроком (7 дней)
    const today = new Date();
    const weekLater = new Date();
    weekLater.setDate(today.getDate() + 7);

    const expiringBatches = await this.prisma.batch.findMany({
      where: {
        status: 'ACTIVE',
        remainingQty: { gt: 0 },
        expiryDate: {
          not: null,
          lte: weekLater,
          gte: today,
        },
      },
      include: {
        product: { select: { title: true } },
      },
    });

    const expiringValue = expiringBatches.reduce(
      (sum, b) => sum + b.remainingQty * b.purchasePrice,
      0,
    );

    return {
      totalWriteOffs: writeOffs.length,
      totalQuantity,
      totalValue,
      byProduct: byProductList,
      byDate: Object.entries(byDate)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => b.date.localeCompare(a.date)),
      expiringBatches: expiringBatches.length,
      expiringValue,
      expiringProducts: expiringBatches.map((b) => ({
        batchCode: b.batchCode,
        productTitle: b.product.title,
        quantity: b.remainingQty,
        value: b.remainingQty * b.purchasePrice,
        expiryDate: b.expiryDate,
      })),
    };
  }
}
