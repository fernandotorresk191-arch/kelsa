import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { AdminGuard } from './admin.guard';

interface AuthRequest {
  user: { role: string };
  darkstoreId: string | null;
}

@Controller('v1/admin/clients')
@UseGuards(AdminGuard)
export class AdminClientsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getClients(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
    @Query('sortBy') sortBy = 'lastOrder', // lastOrder | totalSpent | totalOrders | createdAt
    @Req() req?: AuthRequest,
  ) {
    const darkstoreFilter = req?.darkstoreId ? { darkstoreId: req.darkstoreId } : {};
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { login: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Если выбран даркстор — показываем только клиентов, у которых есть заказы в этом дарксторе
    if (req?.darkstoreId) {
      where.orders = { some: { darkstoreId: req.darkstoreId } };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          login: true,
          name: true,
          phone: true,
          email: true,
          settlement: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    if (users.length === 0) {
      return {
        data: [],
        pagination: { page: parseInt(page), limit: take, total: 0, totalPages: 0 },
      };
    }

    const userIds = users.map((u) => u.id);

    // Агрегируем статистику по доставленным заказам
    const deliveredStats = await this.prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, status: 'DELIVERED', ...darkstoreFilter },
      _sum: { totalAmount: true },
      _count: true,
      _max: { createdAt: true },
    });

    // Общее число заказов (любой статус) для каждого клиента в рамках даркстора
    const totalOrderStats = await this.prisma.order.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds }, ...darkstoreFilter },
      _count: true,
    });

    const deliveredMap = new Map(deliveredStats.map((s) => [s.userId, s]));
    const totalOrderMap = new Map(totalOrderStats.map((s) => [s.userId, s]));

    let data = users.map((u) => {
      const ds = deliveredMap.get(u.id);
      const ts = totalOrderMap.get(u.id);
      return {
        id: u.id,
        login: u.login,
        name: u.name,
        phone: u.phone,
        email: u.email,
        settlement: u.settlement,
        createdAt: u.createdAt,
        totalOrders: ts?._count ?? 0,
        deliveredOrders: ds?._count ?? 0,
        totalSpent: ds?._sum.totalAmount ?? 0,
        lastOrderAt: ds?._max.createdAt ?? null,
      };
    });

    // Сортировка
    if (sortBy === 'totalSpent') {
      data.sort((a, b) => b.totalSpent - a.totalSpent);
    } else if (sortBy === 'totalOrders') {
      data.sort((a, b) => b.totalOrders - a.totalOrders);
    } else if (sortBy === 'lastOrder') {
      data.sort((a, b) => {
        if (!a.lastOrderAt) return 1;
        if (!b.lastOrderAt) return -1;
        return new Date(b.lastOrderAt).getTime() - new Date(a.lastOrderAt).getTime();
      });
    }
    // createdAt — уже отсортировано на уровне запроса

    return {
      data,
      pagination: {
        page: parseInt(page),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  @Get(':id')
  async getClient(@Param('id') id: string, @Req() req?: AuthRequest) {
    const darkstoreFilter = req?.darkstoreId ? { darkstoreId: req.darkstoreId } : {};

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        login: true,
        name: true,
        phone: true,
        email: true,
        settlement: true,
        addressLine: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('Client not found');

    const [allOrders, deliveredAgg, firstOrder, statusBreakdown, topProducts] =
      await Promise.all([
        // Последние 30 заказов
        this.prisma.order.findMany({
          where: { userId: id, ...darkstoreFilter },
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            deliveryFee: true,
            settlement: true,
            createdAt: true,
            canceledBy: true,
            darkstore: { select: { name: true, shortName: true } },
            items: {
              select: { title: true, qty: true, price: true },
              take: 3,
            },
          },
        }),

        // Финансовые показатели (только доставленные)
        this.prisma.order.aggregate({
          where: { userId: id, status: 'DELIVERED', ...darkstoreFilter },
          _sum: { totalAmount: true, deliveryFee: true },
          _count: true,
          _avg: { totalAmount: true },
          _max: { createdAt: true },
          _min: { createdAt: true },
        }),

        // Первый заказ (любой статус)
        this.prisma.order.findFirst({
          where: { userId: id, ...darkstoreFilter },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        }),

        // Разбивка по статусам
        this.prisma.order.groupBy({
          by: ['status'],
          where: { userId: id, ...darkstoreFilter },
          _count: true,
        }),

        // Топ-5 товаров по количеству (из доставленных заказов)
        this.prisma.orderItem.groupBy({
          by: ['productId', 'title'],
          where: { order: { userId: id, status: 'DELIVERED', ...darkstoreFilter } },
          _sum: { qty: true, amount: true },
          _count: true,
          orderBy: { _sum: { qty: 'desc' } },
          take: 5,
        }),
      ]);

    const totalOrdersCount = await this.prisma.order.count({
      where: { userId: id, ...darkstoreFilter },
    });

    // Рассчитываем «ценность» клиента (LTV): суммарные траты на доставленные заказы
    // Recency — дней с последнего заказа
    const lastOrderAt = deliveredAgg._max.createdAt
      ?? allOrders[0]?.createdAt
      ?? null;
    const daysSinceLastOrder = lastOrderAt
      ? Math.floor((Date.now() - new Date(lastOrderAt).getTime()) / 86_400_000)
      : null;

    const firstOrderAt = firstOrder?.createdAt ?? null;
    const daysSinceRegistration = firstOrderAt
      ? Math.floor((Date.now() - new Date(firstOrderAt).getTime()) / 86_400_000)
      : null;

    return {
      user,
      stats: {
        totalOrders: totalOrdersCount,
        deliveredOrders: deliveredAgg._count,
        canceledOrders:
          statusBreakdown.find((s) => s.status === 'CANCELED')?._count ?? 0,
        totalSpent: deliveredAgg._sum.totalAmount ?? 0,
        totalDeliveryFee: deliveredAgg._sum.deliveryFee ?? 0,
        avgOrderValue: Math.round(deliveredAgg._avg.totalAmount ?? 0),
        firstOrderAt,
        lastOrderAt,
        daysSinceLastOrder,
        daysSinceRegistration,
        statusBreakdown: statusBreakdown.map((s) => ({
          status: s.status,
          count: s._count,
        })),
      },
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        title: p.title,
        totalQty: p._sum.qty ?? 0,
        totalAmount: p._sum.amount ?? 0,
        ordersCount: p._count,
      })),
      recentOrders: allOrders,
    };
  }
}
