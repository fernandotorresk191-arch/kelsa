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
}
