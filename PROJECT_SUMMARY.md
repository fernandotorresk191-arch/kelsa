# 📊 Kelsa — Сводка проекта

**Последнее обновление:** Апрель 2026

---

## 🎯 О проекте

**Kelsa** — мультитенантная PWA-платформа доставки продуктов с тремя приложениями: клиентский магазин, бэкофис для менеджеров и курьерское PWA-приложение. Каждый даркстор — изолированная единица со своими товарами, ценами, остатками, курьерами и зонами доставки.

---

## 📈 Текущее состояние

### Backend (NestJS + Prisma)

**11 модулей, 16 файлов в admin-модуле:**

| Модуль | Файлы | Описание |
|--------|-------|----------|
| `admin/` | 16 | Бэкофис: 13 контроллеров + guard + roles + cron |
| `auth/` | 2 | Авторизация клиентов (JWT) |
| `catalog/` | 2 | Публичный каталог, категории, товары |
| `cart/` | 3 | Корзина (контроллер + DTO) |
| `orders/` | 3 | Создание и получение заказов |
| `courier/` | 5 | Курьерское API (авторизация, заказы, события, JWT guard) |
| `chat/` | 3 | Чат между клиентом и менеджером + cleanup |
| `events/` | 3 | SSE real-time события |
| `push/` | 3 | Web Push уведомления |
| `upload/` | 2 | Загрузка файлов (изображений) |
| `kopilka/` | 2 | Групповые накопления |

### Frontend (Next.js 15 + React 19)

**13 админ-страниц, 20 файлов в /admin:**

| Раздел | Страницы |
|--------|----------|
| Дашборд | `/admin` |
| Заказы | `/admin/orders`, `/admin/orders/[id]` |
| Каталог | `/admin/catalog` |
| Товары | `/admin/products`, `/admin/products/[id]` |
| Баннеры | `/admin/promotions` |
| Закупки | `/admin/purchases`, `/admin/purchases/[id]` |
| Просрочка | `/admin/expiry` |
| Аналитика | `/admin/analytics` |
| Курьеры | `/admin/couriers`, `/admin/couriers/[id]` |
| Зоны доставки | `/admin/delivery-zones` |
| Дарксторы | `/admin/darkstores` |
| Пользователи | `/admin/users` |
| Сервер | `/admin/server` |

**Клиентские страницы:**
- Главная, Каталог, Товар, Поиск, Корзина
- Личный кабинет (заказы, избранное)
- О компании, Покрытие, Копилка

**Курьерское приложение** (`/courier`):
- Авторизация, Список заказов, Детали заказа
- GPS-трек, Статусы, History

### База данных (Prisma)

**17 моделей, 6 enum-ов:**

| Модель | Ключевые поля |
|--------|---------------|
| Darkstore | name, shortName, address, isActive |
| DarkstoreProduct | productId, darkstoreId, price, stock, maxPerOrder, cellNumber |
| Product | title, slug, barcode, weight, isActive |
| Category | name, slug, parentId (иерархия), markupPercent, darkstoreId |
| Cart / CartItem | token, status, qty |
| Order / OrderItem | orderNumber, status, totalAmount, profit, deliveryFee |
| OrderStatusHistory | orderId, status, comment, changedBy |
| Purchase / Batch | purchaseNumber, batchCode, remainingQty, expiryDate, FIFO |
| WriteOff | batchId, quantity, reason |
| DeliveryZone | settlement, deliveryFee, freeDeliveryFrom, darkstoreId |
| Courier | fullName, status, phone, darkstoreId |
| User | login, email, name, phone, settlement |
| AdminUser | email, role (superadmin/admin/manager), permissions |
| ChatMessage | sender, text, imageUrl, latitude, longitude, isRead |
| Promotion | title, imageUrl, url, sort, darkstoreId |
| Favorite | userId, productId |
| Kopilka / KopilkaMember / KopilkaContribution | Групповые накопления |

---

## 🔌 API Эндпоинты (50+)

### Клиентские
| Группа | Эндпоинты |
|--------|-----------|
| Auth | POST register, POST login, GET /me |
| Catalog | GET categories, subcategories, products, promotions, delivery-settings |
| Cart | GET cart, POST/PATCH/DELETE items, GET totals, POST validate |
| Orders | POST create, GET by orderNumber, PATCH cancel |
| Chat | GET/POST messages, PATCH read, image upload |
| Events (SSE) | GET /events/my-orders |
| Push | GET vapid-key, POST subscribe |
| Favorites | GET/POST/DELETE |
| Kopilka | CRUD |

### Админские
| Группа | Эндпоинты |
|--------|-----------|
| Auth | POST login, GET /me, CRUD users |
| Orders | List, detail, status update, courier assignment, print invoice/picking |
| Products | CRUD + stock update |
| Categories | CRUD (иерархия) |
| Promotions | CRUD |
| Purchases | Create, list, detail |
| Expiry | List, discount, write-off |
| Analytics | Dashboard, orders-stats, products-sales, revenue |
| Couriers | CRUD |
| Delivery Zones | CRUD |
| Darkstores | CRUD (superadmin) |
| Server | Status, ping |

### Курьерские
| Группа | Эндпоинты |
|--------|-----------|
| Auth | POST login |
| Orders | List, detail, accept, status update, GPS |
| Events (SSE) | GET /events/courier |

---

## 🏗️ Ключевые архитектурные решения

1. **Мультитенантность** — Darkstore-модель, `X-Darkstore-Id` заголовок, AdminGuard с проверкой доступа
2. **FIFO-учёт** — Партии (Batch) с expiryDate, автоматическое списание при доставке
3. **DarkstoreProduct** — Цены и остатки per-darkstore (один глобальный Product, разные цены в дарксторах)
4. **SSE Real-time** — Обновления заказов, чат, события для курьеров
5. **Ценообразование** — Закупочная цена × наценка (категория/подкатегория), скидки за просрочку
6. **Экономика** — Прибыль = subtotal − purchaseCost − courierCost (считается только при DELIVERED)

---

## ✅ Система резервирования остатков

Реализована полная система контроля остатков на всех уровнях:

### Проверка при работе с корзиной
- **Добавление в корзину** (`POST /v1/cart/items`) — проверяет `stock` и `maxPerOrder` на DarkstoreProduct. Если товара недостаточно, клиент получает ошибку с текстом «Недостаточно товара на складе. Доступно: N шт.» или «Максимум N шт. на заказ».
- **Изменение количества** (`PATCH /v1/cart/items/:id`) — аналогичная проверка.
- **Обогащение корзины** — каждый item корзины содержит `stock` и `maxPerOrder`, фронтенд блокирует кнопку «+» при достижении лимита.

### Валидация перед оформлением
- **Эндпоинт валидации** (`POST /v1/cart/:token/validate`) — проверяет ВСЕ товары корзины разом. Возвращает список проблем: `OUT_OF_STOCK`, `INSUFFICIENT_STOCK`, `OVER_LIMIT`. Фронтенд показывает диалог.

### Атомарное резервирование при создании заказа
- **Внутри транзакции** (`POST /v1/orders`) — повторная проверка остатков + `stock: { decrement }` выполняются атомарно в `$transaction`. Два пользователя не могут зарезервировать один и тот же товар.

### Возврат при отмене
- **Отмена клиентом** (`PATCH /v1/orders/:orderNumber/cancel`) — доступна только для заказов в статусе `NEW`. Возвращает `stock: { increment }` обратно.
- **Отмена менеджером** — при смене статуса на `CANCELED` возвращает товар, если заказ ещё не был доставлен.

### FIFO-списание
- Партии (Batch) списываются только при статусе `DELIVERED`. Остатки `DarkstoreProduct.stock` уменьшаются при создании заказа, FIFO — при доставке.

---

## 📖 Документация

| Файл | Описание |
|------|----------|
| **README.md** | Общая информация, структура, быстрый старт |
| **BACKOFFICE_GUIDE.md** | Руководство администратора бэкофиса |
| **BACKOFFICE_QUICKSTART.md** | Быстрый старт за 5 минут |
| **DARKSTORE_ARCHITECTURE.md** | Архитектура мультитенантности |
| **ECONOMICS.md** | Экономика: FIFO, ценообразование, прибыль |
| **DEPLOYMENT.md** | Развертывание на production (NGINX, Docker, SSL) |

**Проект завершён: 20 января 2026**  
**Версия: 1.1** — добавлена система резервирования остатков  
**Статус: ✅ ГОТОВО К ИСПОЛЬЗОВАНИЮ**
