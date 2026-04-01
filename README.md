# 🛒 Kelsa — Платформа доставки продуктов

**Kelsa** — мультитенантная PWA-платформа доставки продуктов на дом с тремя приложениями: клиентский магазин, бэкофис для менеджеров и курьерское приложение.

## ✨ Особенности

- 📱 **PWA** — установка на любое устройство (Web, iOS, Android, Windows, macOS)
- 🏪 **Мультитенантность (дарксторы)** — каждый даркстор со своими товарами, ценами, остатками, курьерами и зонами доставки
- 🛍️ **Каталог товаров** — с иерархическими категориями, подкатегориями, поиском и скидками
- 🛒 **Корзина и заказы** — оформление с привязкой к населённому пункту
- 💬 **Чат** — WhatsApp-стиль (текст, фото, геолокация) между клиентом и менеджером
- 🚚 **Курьерское приложение** — отдельное PWA для курьеров с GPS-треком
- 📦 **Складской учёт** — закупки, партии (Batch), FIFO-списание, просрочка
- 💰 **Экономика** — автоматическое ценообразование, расчёт прибыли, аналитика
- 🔔 **Push-уведомления и SSE** — real-time обновления статусов заказов
- ❤️ **Избранные товары** — сохранение понравившихся товаров
- 🐷 **Копилка** — групповые накопления

## 🏗️ Архитектура

```
Kelsa
├── Frontend (Next.js 15 + React 19)
│   ├── Клиентский магазин          (/ маршруты)
│   ├── Админ-панель / Бэкофис      (/admin маршруты)
│   └── Курьерское приложение       (/courier маршруты)
│
└── Backend (NestJS + Prisma + PostgreSQL)
    └── REST API + SSE
        ├── Клиентские эндпоинты    (/v1/*)
        ├── Админ эндпоинты         (/v1/admin/*)
        └── Курьерские эндпоинты    (/v1/courier/*)
```

## 🚀 Быстрый старт

### Требования
- Node.js 18+
- PostgreSQL 15+
- npm

### Установка

```bash
# 1. Клонировать репозиторий
git clone https://github.com/yourusername/kelsa.git
cd kelsa

# 2. Установить бэкэнд
cd backend/api
npm install
npx prisma migrate dev
npm run start:dev

# 3. В новом терминале: установить фронтэнд
cd frontend
npm install
npm run dev
```

### Открыть приложение

- **Магазин**: http://localhost:3000
- **Админ-панель**: http://localhost:3000/admin/login
- **Курьерское приложение**: http://localhost:3000/courier/login

## 📚 Документация

- [**BACKOFFICE_QUICKSTART.md**](./BACKOFFICE_QUICKSTART.md) — быстрый старт админ-панели
- [**BACKOFFICE_GUIDE.md**](./BACKOFFICE_GUIDE.md) — полное руководство для администраторов
- [**DARKSTORE_ARCHITECTURE.md**](./DARKSTORE_ARCHITECTURE.md) — архитектура мультитенантности
- [**ECONOMICS.md**](./ECONOMICS.md) — экономика: ценообразование, FIFO, прибыль
- [**DEPLOYMENT.md**](./DEPLOYMENT.md) — развертывание на production

## 🛠️ Структура проекта

```
kelsa/
├── backend/
│   └── api/
│       ├── src/
│       │   ├── admin/              # Бэкофис (16 файлов)
│       │   │   ├── admin.module.ts
│       │   │   ├── admin.guard.ts
│       │   │   ├── roles.decorator.ts
│       │   │   ├── cron-registry.service.ts
│       │   │   ├── admin-auth.controller.ts
│       │   │   ├── admin-orders.controller.ts
│       │   │   ├── admin-products.controller.ts
│       │   │   ├── admin-categories.controller.ts
│       │   │   ├── admin-promotions.controller.ts
│       │   │   ├── admin-purchases.controller.ts
│       │   │   ├── admin-expiry.controller.ts
│       │   │   ├── admin-analytics.controller.ts
│       │   │   ├── admin-couriers.controller.ts
│       │   │   ├── admin-delivery-zones.controller.ts
│       │   │   ├── admin-darkstores.controller.ts
│       │   │   └── admin-server.controller.ts
│       │   ├── auth/               # Авторизация пользователей
│       │   ├── catalog/            # Каталог (категории, товары, промо)
│       │   ├── cart/               # Корзина
│       │   ├── orders/             # Заказы
│       │   ├── courier/            # Курьерский модуль (авторизация, заказы, события)
│       │   ├── chat/               # Чат (сообщения, изображения, очистка)
│       │   ├── events/             # SSE-события (real-time обновления)
│       │   ├── push/               # Web Push уведомления
│       │   ├── upload/             # Загрузка файлов
│       │   ├── kopilka/            # Копилка (групповые накопления)
│       │   └── app.module.ts
│       └── prisma/
│           ├── schema.prisma       # 17 моделей, 6 enum-ов
│           └── migrations/
│
├── frontend/
│   ├── app/
│   │   ├── admin/                  # Бэкофис (20 файлов, 13 страниц)
│   │   │   ├── login/              # Вход
│   │   │   ├── page.tsx            # Дашборд
│   │   │   ├── orders/             # Заказы + детали + чат
│   │   │   ├── catalog/            # Категории
│   │   │   ├── products/           # Товары + редактирование
│   │   │   ├── promotions/         # Баннеры
│   │   │   ├── purchases/          # Закупки + детали
│   │   │   ├── expiry/             # Просрочка/списания
│   │   │   ├── analytics/          # Аналитика
│   │   │   ├── couriers/           # Курьеры + детали
│   │   │   ├── delivery-zones/     # Зоны доставки
│   │   │   ├── darkstores/         # Управление дарксторами
│   │   │   ├── users/              # Пользователи (админы/менеджеры)
│   │   │   └── server/             # Статус сервера
│   │   ├── courier/                # Курьерское PWA-приложение
│   │   ├── account/                # Личный кабинет клиента
│   │   ├── category/[slug]/        # Страница категории
│   │   ├── product/                # Страница товара
│   │   ├── search/                 # Поиск
│   │   ├── kopilka/                # Копилка
│   │   ├── coverage/               # Зона покрытия
│   │   ├── about/                  # О компании
│   │   └── page.tsx                # Главная страница
│   ├── components/
│   │   ├── admin/                  # AdminProvider, DarkstoreSwitcher
│   │   ├── auth/                   # Авторизация клиентов
│   │   ├── cart/                   # Корзина (CartDialog)
│   │   ├── courier/                # Компоненты курьера
│   │   ├── header/, footer/        # Шапка, подвал
│   │   ├── orders/                 # Компоненты заказов (чат, статус)
│   │   ├── product/, category/     # Карточки товаров
│   │   ├── promotions/, kopilka/   # Баннеры, копилка
│   │   └── ui/                     # UI-kit (Button, Input, Dialog...)
│   ├── features/
│   │   ├── admin/                  # Admin API и типы
│   │   ├── auth/, cart/, catalog/  # Клиентские API
│   │   ├── courier/                # Courier API
│   │   ├── orders/, favorites/     # Заказы, избранное
│   │   └── kopilka/                # Kopilka API
│   └── shared/
│       ├── api/                    # HTTP-клиент, конфигурация
│       ├── auth/, cart/, phone/    # Shared утилиты
│       └── settlement/             # Населённые пункты
```

## 🗄️ База данных (Prisma)

**17 моделей, 6 enum-ов:**

| Модель | Описание |
|--------|----------|
| **Darkstore** | Даркстор (склад-магазин). Все данные привязаны к нему |
| **DarkstoreProduct** | Связь товара с дарксторм: цена, остаток, ячейка |
| **Product** | Глобальный товар (title, slug, barcode, вес) |
| **Category** | Иерархические категории (с наценкой markupPercent) |
| **Cart / CartItem** | Корзина покупателя (по token) |
| **Order / OrderItem** | Заказы с экономикой (прибыль, себестоимость) |
| **OrderStatusHistory** | История статусов заказа |
| **Purchase / Batch** | Закупки и партии (FIFO-учёт) |
| **WriteOff** | Списания просроченных товаров |
| **DeliveryZone** | Зоны доставки по населённым пунктам |
| **Courier** | Курьеры с GPS-статусами |
| **User** | Клиенты (покупатели) |
| **AdminUser** | Администраторы/менеджеры |
| **ChatMessage** | Сообещния чата (текст, фото, координаты) |
| **Promotion** | Баннеры/акции |
| **Kopilka** / **KopilkaMember** / **KopilkaContribution** | Групповые накопления |
| **Favorite** | Избранные товары |

## 🔄 Статусы заказа

```
NEW → CONFIRMED → ASSEMBLING → ASSIGNED_TO_COURIER → ACCEPTED_BY_COURIER → ON_THE_WAY → DELIVERED
                                                                                       ↘ CANCELED
```

## 🔐 Роли и безопасность

| Роль | Доступ |
|------|--------|
| **superadmin** | Все дарксторы, управление всей системой |
| **admin** | Полный доступ к назначенным дарксторам |
| **manager** | Ограниченные права по разделам |

- JWT Token авторизация (отдельно для клиентов, админов, курьеров)
- bcrypt хэширование паролей
- AdminGuard + @Roles() декоратор
- X-Darkstore-Id заголовок для мультитенантности

## 🎯 Функциональность бэкофиса (13 разделов)

| Раздел | Путь | Описание |
|--------|------|----------|
| Дашборд | `/admin` | KPI, статусы заказов, топ товаров |
| Заказы | `/admin/orders` | Список, детали, статусы, чат, печать |
| Каталог | `/admin/catalog` | Иерархические категории |
| Товары | `/admin/products` | CRUD товаров, цены, остатки |
| Баннеры | `/admin/promotions` | Управление акциями |
| Закупки | `/admin/purchases` | Создание закупок, партии |
| Просрочка | `/admin/expiry` | Отслеживание сроков, списание |
| Аналитика | `/admin/analytics` | Графики выручки, статистика |
| Курьеры | `/admin/couriers` | Управление курьерами |
| Зоны доставки | `/admin/delivery-zones` | Тарифы по населённым пунктам |
| Дарксторы | `/admin/darkstores` | Создание/управление дарксторами |
| Пользователи | `/admin/users` | Управление админами/менеджерами |
| Сервер | `/admin/server` | Системная информация |

## 📱 PWA возможности

Приложение работает как полноценное PWA:

```bash
# На мобильном или десктопе
1. Откройте http://localhost:3000
2. В браузере кликните "Установить"
3. Приложение установится на устройство
4. Работает офлайн (когда интернет есть)
5. Синхронизирует данные в фоне
```

### Поддерживаемые платформы
- ✅ Chrome/Chromium (Android, Windows, macOS, Linux)
- ✅ Safari (iOS)
- ✅ Edge (Windows, macOS)
- ✅ Firefox (с ограничениями)

## 🗄️ База данных

### Основные модели
- **User** — пользователи приложения
- **Product** — товары с остатками
- **Category** — категории товаров
- **Cart** — корзины товаров
- **CartItem** — товары в корзине
- **Order** — заказы
- **OrderItem** — товары в заказе
- **OrderStatusHistory** — история статусов заказа
- **AdminUser** — администраторы системы
- **Favorite** — избранные товары

### Миграции
```
20260118104143_init              — Начальная схема
20260118144158_admin_user        — Добавлена таблица AdminUser
20260119071340_cart_orders       — Добавлены Cart и Order
20260119165114_user_auth         — Улучшена авторизация пользователей
20260120104139_add_user_name     — Добавлено имя пользователя
20260125120000_add_favorites     — Добавлены избранные товары
20260120_add_stock_and_order_history — Добавлены остатки и история статусов
```

## 🚀 Production развертывание

### Docker
```bash
docker-compose up -d
```

### Вручную
1. Настроить NGINX (см. DEPLOYMENT.md)
2. Установить SSL сертификат
3. Развернуть на сервер
4. Создать суперадминистратора в БД

Подробная инструкция в [DEPLOYMENT.md](./DEPLOYMENT.md)

## 💡 Технологический стек

### Frontend
- **Framework**: Next.js 15 (React 18)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Embla Carousel
- **State Management**: React Context
- **API Client**: Fetch API
- **PWA**: next-pwa

### Backend
- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: JWT + bcrypt
- **Validation**: class-validator
- **API Docs**: Swagger

## 📖 API Документация

### Пользовательские эндпоинты
```
POST   /v1/auth/register        — Регистрация
POST   /v1/auth/login           — Вход
GET    /v1/me                   — Профиль
GET    /v1/catalog              — Каталог товаров
GET    /v1/cart                 — Получить корзину
POST   /v1/orders               — Создать заказ
GET    /v1/orders/:id           — Детали заказа
```

### Админ эндпоинты
```
POST   /v1/admin-auth/login     — Вход администратора
GET    /v1/admin-auth/me        — Профиль администратора
GET    /v1/admin/orders         — Список заказов
GET    /v1/admin/orders/:id     — Детали заказа
PATCH  /v1/admin/orders/:id/status — Изменить статус
GET    /v1/admin/products       — Список товаров
POST   /v1/admin/products       — Добавить товар
PUT    /v1/admin/products/:id   — Редактировать товар
DELETE /v1/admin/products/:id   — Удалить товар
GET    /v1/admin/analytics/dashboard — Панель управления
GET    /v1/admin/analytics/revenue-analytics — Выручка
```

## 🐛 Troubleshooting

### Проблемы с БД
```bash
# Сбросить БД
npx prisma migrate reset

# Проверить статус миграций
npx prisma migrate status
```

### Проблемы с фронтэндом
```bash
# Очистить кэш
rm -rf .next
npm run build
npm run dev
```

### Проблемы с авторизацией
- Проверить JWT_SECRET в .env
- Проверить срок действия токена (30 дней)
- Очистить localStorage в браузере

## 📞 Поддержка и вклад

По вопросам или предложениям создавайте issues.

## 📄 Лицензия

UNLICENSED

---

**Версия**: 1.0  
**Последнее обновление**: 20 января 2026  
**Статус**: ✅ Готово к использованию
