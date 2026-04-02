# 🎯 Quick Start — Backoffice Kelsa

**Последнее обновление:** Апрель 2026

## ⚡ Быстрый старт (5 минут)

### Шаг 1: Подготовка БД

```bash
cd backend/api
npx prisma migrate deploy
# Или если первый запуск:
npx prisma migrate dev
```

### Шаг 2: Создать администратора

Выполните в PostgreSQL или используйте Prisma Studio:

```bash
npx prisma studio
```

В интерфейсе создайте запись в таблице `AdminUser`:
- email: `admin@example.com`
- passwordHash: Нужен bcrypt хэш (см. ниже)
- role: `superadmin` (или `admin` / `manager`)
- isActive: `true`

**Как создать bcrypt хэш:**

```bash
node -e "require('bcrypt').hash('MyPassword123', 10).then(console.log)"
```

Результат скопировать в `passwordHash`.

### Шаг 3: Создать даркстор

В таблице `Darkstore` создайте запись:
- name: `Основной склад`
- isActive: `true`

Затем в `AdminUserDarkstore` привяжите админа к даркстору.

### Шаг 4: Запустить бэкэнд

```bash
cd backend/api
npm install
npm run start:dev
```

### Шаг 5: Запустить фронтэнд

В новом терминале:

```bash
cd frontend
npm install
npm run dev
```

### Шаг 6: Открыть админ-панель

```
http://localhost:3000/admin/login
```

---

## 📋 Компоненты системы

### Backend (NestJS) — 17 файлов в admin-модуле

| Файл | Описание |
|------|----------|
| `admin.module.ts` | NestJS модуль |
| `admin.guard.ts` | Guard с проверкой ролей и дарксторов |
| `roles.decorator.ts` | Декоратор @Roles() |
| `cron-registry.service.ts` | Cron-задачи |
| `admin-auth.controller.ts` | Логин, профиль, CRUD пользователей |
| `admin-orders.controller.ts` | Заказы: список, детали, статусы, назначение курьера, печать |
| `admin-products.controller.ts` | Товары: CRUD, остатки, DarkstoreProduct |
| `admin-categories.controller.ts` | Категории: глобальный CRUD, Toggle через DarkstoreCategory |
| `admin-promotions.controller.ts` | Баннеры: CRUD |
| `admin-purchases.controller.ts` | Закупки: создание, партии (Batch) |
| `admin-expiry.controller.ts` | Просрочка: скидки, списания |
| `admin-analytics.controller.ts` | Аналитика: дашборд, статистика |
| `admin-clients.controller.ts` | Клиенты: список, профиль, LTV, сегментация |
| `admin-couriers.controller.ts` | Курьеры: CRUD |
| `admin-delivery-zones.controller.ts` | Зоны доставки: CRUD |
| `admin-darkstores.controller.ts` | Дарксторы: CRUD (superadmin) |
| `admin-server.controller.ts` | Статус сервера |

### Frontend (Next.js) — 20 файлов в /admin

| Страница | Путь |
|----------|------|
| Вход | `/admin/login` |
| Дашборд | `/admin` |
| Заказы | `/admin/orders`, `/admin/orders/[id]` |
| Каталог | `/admin/catalog` |
| Товары | `/admin/products`, `/admin/products/[id]` |
| Баннеры | `/admin/promotions` |
| Закупки | `/admin/purchases`, `/admin/purchases/[id]` |
| Просрочка | `/admin/expiry` |
| Аналитика | `/admin/analytics` |
| Клиенты | `/admin/clients`, `/admin/clients/[id]` |
| Курьеры | `/admin/couriers`, `/admin/couriers/[id]` |
| Зоны доставки | `/admin/delivery-zones` |
| Дарксторы | `/admin/darkstores` |
| Пользователи | `/admin/users` |
| Сервер | `/admin/server` |

### Prisma БД — ключевые модели

| Модель | Описание |
|--------|----------|
| `Darkstore` | Даркстор (склад-магазин) |
| `DarkstoreProduct` | Привязка товара к даркстору: цена, остаток, ячейка |
| `Product` | Глобальный товар |
| `Category` | Иерархические категории (с markupPercent) |
| `Order` / `OrderItem` | Заказы с экономикой |
| `Purchase` / `Batch` | Закупки и FIFO-партии |
| `DeliveryZone` | Зоны доставки по населённым пунктам |
| `Courier` | Курьеры |
| `AdminUser` | Админы/менеджеры (superadmin, admin, manager) |
| `AdminUserDarkstore` | Привязка админов к дарксторам |

---

## 🔐 Безопасность

- JWT Token авторизация (отдельно для клиентов, админов, курьеров)
- AdminGuard с проверкой ролей через @Roles() декоратор
- X-Darkstore-Id заголовок для мультитенантности
- bcrypt хэширование паролей
- Мягкое удаление — товары отключаются, не удаляются

---

## 🆘 Частые вопросы

**Q: Забыл пароль администратора**
A: Подключитесь к БД и обновите запись в `AdminUser` с новым bcrypt хэшем.

**Q: Как добавить еще администратора?**
A: Через админ-панель → Пользователи → Добавить. Или через API (`POST /v1/admin-auth/create`).

**Q: Товар не появляется на сайте после добавления**
A: Убедитесь, что:
   - Product: `isActive = true`
   - Есть DarkstoreProduct с `price > 0` и `stock > 0`
   - `categoryId` заполнен

**Q: Не вижу данных в админке**
A: Проверьте, выбран ли правильный даркстор в переключателе.

---

**Версия:** 2.0  
**Дата:** Апрель 2026
