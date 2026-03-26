# 🛒 Kelsa - Приложение доставки продуктов

**Kelsa** — это PWA приложение для доставки продуктов на дом с полнофункциональным бэкофисом для управления заказами и товарами.

## ✨ Особенности

- 📱 **PWA приложение** — работает на всех платформах (Web, iOS, Android, Windows, macOS)
- 👥 **Система авторизации** — регистрация и вход для клиентов
- 🛍️ **Каталог товаров** — с категориями и поиском
- 🛒 **Корзина товаров** — с управлением количеством
- ❤️ **Избранные товары** — сохранение понравившихся товаров
- 🚚 **Отслеживание заказов** — история статусов заказа
- 📊 **Бэкофис** — админ-панель для менеджеров
- 💰 **Аналитика** — отчеты по продажам

## 🏗️ Архитектура

```
Kelsa
├── Frontend (Next.js 15)
│   ├── Клиентская часть (/ маршруты)
│   └── Админ-панель (/admin маршруты)
└── Backend (NestJS)
    └── REST API
        ├── Пользовательские эндпоинты
        └── Админ эндпоинты
```

## 🚀 Быстрый старт

### Требования
- Node.js 18+
- PostgreSQL 12+
- npm/yarn

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

- **Сайт**: http://localhost:3000
- **Админ-панель**: http://localhost:3000/admin/login

## 📚 Документация

- [**BACKOFFICE_QUICKSTART.md**](./BACKOFFICE_QUICKSTART.md) — быстрый старт админ-панели
- [**BACKOFFICE_GUIDE.md**](./BACKOFFICE_GUIDE.md) — полное руководство для администраторов
- [**DEPLOYMENT.md**](./DEPLOYMENT.md) — развертывание на production
- [**CHANGES_SUMMARY.md**](./CHANGES_SUMMARY.md) — описание последних обновлений

## 🛠️ Структура проекта

```
kelsa/
├── backend/
│   └── api/
│       ├── src/
│       │   ├── admin/              # 🆕 Админ-панель
│       │   │   ├── admin-auth.controller.ts
│       │   │   ├── admin-orders.controller.ts
│       │   │   ├── admin-products.controller.ts
│       │   │   ├── admin-analytics.controller.ts
│       │   │   └── admin.module.ts
│       │   ├── auth/               # Авторизация пользователей
│       │   ├── catalog/            # Каталог товаров
│       │   ├── cart/               # Корзина товаров
│       │   ├── orders/             # Заказы
│       │   └── app.module.ts
│       └── prisma/
│           ├── schema.prisma
│           └── migrations/
│
├── frontend/
│   ├── app/
│   │   ├── admin/                  # 🆕 Админ-панель
│   │   │   ├── login/page.tsx
│   │   │   ├── page.tsx
│   │   │   ├── orders/
│   │   │   ├── products/
│   │   │   └── analytics/
│   │   ├── page.tsx                # Главная страница
│   │   ├── search/
│   │   ├── category/
│   │   ├── product/
│   │   └── account/
│   ├── components/
│   │   ├── admin/                  # 🆕 Админ компоненты
│   │   │   └── AdminProvider.tsx
│   │   ├── auth/
│   │   ├── header/
│   │   ├── footer/
│   │   └── ...
│   ├── features/
│   │   ├── admin/                  # 🆕 Админ API и типы
│   │   │   ├── api.ts
│   │   │   └── types.ts
│   │   ├── auth/
│   │   ├── catalog/
│   │   └── ...
│   └── shared/
│
├── BACKOFFICE_QUICKSTART.md
├── BACKOFFICE_GUIDE.md
├── DEPLOYMENT.md
└── README.md
```

## 🌐 Доступные адреса

| Адрес | Описание |
|-------|---------|
| `http://localhost:3000` | Основной сайт Kelsa |
| `http://localhost:3000/admin/login` | Вход в админ-панель |
| `http://localhost:3000/admin` | Панель управления (после входа) |
| `http://localhost:3001` | Backend API |

## 🔐 Безопасность

- ✅ JWT Token авторизация
- ✅ Хэширование паролей (bcrypt)
- ✅ Проверка ролей (admin/manager)
- ✅ HTTPS на production

## 🎯 Функциональность Админ-панели

### Управление заказами
- 📋 Просмотр списка всех заказов
- 🔍 Фильтрация по статусам
- 📝 Просмотр полных деталей заказа
- ✏️ Изменение статуса заказа
- 🖨️ Печать накладных

### Управление товарами
- ➕ Добавление новых товаров
- ✏️ Редактирование товаров (цена, описание, фото)
- 📦 Управление остатками на складе
- ✅ Активация/отключение товаров
- 🗑️ Удаление товаров

### Аналитика
- 📈 Графики выручки (неделя, месяц, год)
- 🏆 Топ товаров по продажам
- 💹 Статистика по заказам
- 📊 KPI панель (всего заказов, выручка, средний чек)

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
