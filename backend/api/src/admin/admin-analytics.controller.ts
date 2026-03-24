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

    // Общая статистика — только доставленные заказы для финансовых показателей
    const deliveredFilter = { status: 'DELIVERED' as const };
    const totalOrders = await this.prisma.order.count();
    const totalDelivered = await this.prisma.order.count({ where: deliveredFilter });
    const aggregates = await this.prisma.order.aggregate({
      where: deliveredFilter,
      _sum: { totalAmount: true, purchaseCost: true, courierCost: true, profit: true },
    });

    // Заказы по статусам
    const ordersByStatus = await this.prisma.order.groupBy({
      by: ['status'],
      _count: true,
    });

    // Продажи за последние 7 дней (только доставленные)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentOrders = await this.prisma.order.findMany({
      where: { createdAt: { gte: sevenDaysAgo }, status: 'DELIVERED' },
      select: { totalAmount: true, createdAt: true },
    });

    // Топ товаров по продажам (только доставленные заказы)
    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId', 'title'],
      where: { order: { status: 'DELIVERED' } },
      _sum: { qty: true, amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todayOrders = await this.prisma.order.findMany({
      where: { createdAt: { gte: todayStart }, status: 'DELIVERED' },
      select: { totalAmount: true, profit: true },
    });

    const totalRevenueToday = todayOrders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0,
    );
    const totalProfitToday = todayOrders.reduce(
      (sum, order) => sum + (order.profit || 0),
      0,
    );

    return {
      overview: {
        totalOrders,
        totalRevenue: aggregates._sum.totalAmount || 0,
        totalRevenueToday,
        totalPurchaseCost: aggregates._sum.purchaseCost || 0,
        totalCourierCost: aggregates._sum.courierCost || 0,
        totalProfit: aggregates._sum.profit || 0,
        totalProfitToday,
        totalDelivered,
        averageOrderValue:
          totalDelivered > 0
            ? (aggregates._sum.totalAmount || 0) / totalDelivered
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
        status: 'DELIVERED',
      },
      select: {
        id: true,
        orderNumber: true,
        createdAt: true,
        totalAmount: true,
        profit: true,
        status: true,
      },
    });

    // Группируем по дням (только доставленные заказы)
    const ordersByDate: Record<string, any> = {};
    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!ordersByDate[date]) {
        ordersByDate[date] = {
          count: 0,
          revenue: 0,
          profit: 0,
          orders: [],
        };
      }
      const orderData = ordersByDate[date] as {
        count: number;
        revenue: number;
        profit: number;
        orders: any[];
      };
      orderData.count++;
      orderData.revenue += order.totalAmount || 0;
      orderData.profit += order.profit || 0;
      orderData.orders.push(order);
    });

    return {
      period: { start, end },
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      totalProfit: orders.reduce((sum, o) => sum + (o.profit || 0), 0),
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
      where: { order: { status: 'DELIVERED' } },
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
        status: 'DELIVERED',
      },
      select: {
        createdAt: true,
        totalAmount: true,
        profit: true,
        purchaseCost: true,
        courierCost: true,
      },
    });

    // Группируем по дням (только доставленные заказы)
    const byDate: Record<string, { revenue: number; profit: number; purchaseCost: number; courierCost: number }> = {};
    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!byDate[date]) {
        byDate[date] = { revenue: 0, profit: 0, purchaseCost: 0, courierCost: 0 };
      }
      byDate[date].revenue += order.totalAmount || 0;
      byDate[date].profit += order.profit || 0;
      byDate[date].purchaseCost += order.purchaseCost || 0;
      byDate[date].courierCost += order.courierCost || 0;
    });

    return {
      period,
      data: Object.entries(byDate).map(([date, vals]) => ({
        date,
        revenue: vals.revenue,
        profit: vals.profit,
        purchaseCost: vals.purchaseCost,
        courierCost: vals.courierCost,
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
