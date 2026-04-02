# Архитектура мультитенантности: Дарксторы

## Концепция

Каждый даркстор — изолированная единица со своими менеджерами, заказами, товарами, категориями, баннерами, закупками, партиями, курьерами, зонами доставки и аналитикой. Суперадмин создаёт дарксторы и назначает персонал.

Пользователи (покупатели) — глобальные. Даркстор определяется по населённому пункту (settlement → DeliveryZone → darkstoreId).

**Товары — глобальные.** `Product` — единая глобальная запись (название, описание, фото, штрихкод). Привязка к даркстору с ценами, остатками и ячейкой хранения осуществляется через модель `DarkstoreProduct`.

---

## Схема базы данных

### Ключевые модели
| Модель | Описание |
|--------|----------|
| `Darkstore` | id (cuid), name, shortName?, address?, isActive, createdAt, updatedAt |
| `AdminUserDarkstore` | Связь M:N между AdminUser и Darkstore (adminUserId + darkstoreId) |
| `DarkstoreProduct` | Привязка глобального Product к Darkstore: цены, остатки, ячейка, категория |

### Модель `DarkstoreProduct` (per-darkstore данные товара)
| Поле | Тип | Описание |
|------|-----|----------|
| `productId` | String | Ссылка на глобальный Product |
| `darkstoreId` | String | Ссылка на Darkstore |
| `price` | Int | Цена продажи (целые рубли) |
| `oldPrice` | Int? | Старая цена для отображения скидки |
| `purchasePrice` | Int? | Закупочная цена последней партии |
| `stock` | Int | Остатки на складе даркстора |
| `cellNumber` | String? | Номер ячейки хранения |
| `maxPerOrder` | Int | Максимум штук в заказе (0 = без лимита, default 10) |
| `categoryId` | String? | Категория в этом дарксторе (может отличаться от глобальной) |
| `subcategoryId` | String? | Подкатегория в этом дарксторе |
| `isActive` | Boolean | Доступен ли товар в этом дарксторе |

`@@unique([productId, darkstoreId])`

### Поле `darkstoreId` в моделях:
| Модель | Обязательность | Примечание |
|--------|---------------|------------|
| Category | **нет** | Глобальная модель, привязка через DarkstoreCategory |
| DarkstoreCategory | required | Связывает Category ↔ Darkstore (isActive per darkstore) |
| Product | **нет** | Product — глобальный, привязка через DarkstoreProduct |
| DarkstoreProduct | required | Связывает Product ↔ Darkstore |
| Promotion | required | |
| Order | required | |
| DeliveryZone | required | Связывает settlement → darkstore |
| Purchase | required | |
| Batch | required (через Purchase) | |
| Courier | required | |
| Cart | optional (nullable) | Назначается при оформлении заказа |

### Модель `Category` (дополнительные поля)
| Поле | Описание |
|------|----------|
| `markupPercent` | Торговая наценка по умолчанию для товаров категории (%) |
| `parentId` | Ссылка на родительскую категорию (для подкатегорий) |
| `parent` / `subcategories` | Иерархическая структура: категория → подкатегории |

### Модель `Order` (дополнительные поля)
| Поле | Описание |
|------|----------|
| `purchaseCost` | Себестоимость товаров (закупочная цена) |
| `courierCost` | Расходы на курьера (тариф зоны доставки) |
| `profit` | Прибыль = totalAmount − purchaseCost − courierCost |
| `settlement` | Населённый пункт заказа |
| `customerLatitude` / `customerLongitude` | Геопозиция клиента (добавляется из чата) |
| `canceledBy` | Кем отменён: `CLIENT \| COURIER \| MANAGER` |
| `cancelReason` | Причина отмены |
| `statusHistory` | Связь с `OrderStatusHistory` (лог смены статусов) |

### Новые модели
| Модель | Описание |
|--------|----------|
| `OrderStatusHistory` | Лог смены статусов заказа (status, comment, changedBy, createdAt) |
| `WriteOff` | Списание партии: batchId, quantity, reason, createdAt |
| `Kopilka` | Сберегательная группа пользователя (goalAmount, startMonth, shareId) |
| `KopilkaMember` | Участник копилки |
| `KopilkaContribution` | Взнос участника (amount, paidMonths) |

### Модель `Batch` (дополнительные поля)
| Поле | Описание |
|------|----------|
| `discountPercent` | Скидка за истекающий срок годности (%) |
| `status` | `ACTIVE \| EXPIRED \| SOLD_OUT \| WRITTEN_OFF` |
| `writeOffs` | Связь со списаниями `WriteOff` |

### Модель `Courier` (актуальное состояние)
- Поле `deliveryRate` **удалено** — тариф берётся из `DeliveryZone.deliveryFee`
- Статусы: `OFF_DUTY | AVAILABLE | ACCEPTED | DELIVERING`

### Модель `DeliveryZone` (актуальное состояние)
| Поле | Описание |
|------|----------|
| `settlement` | Код населённого пункта (`@unique`) |
| `settlementTitle` | Название для отображения |
| `deliveryFee` | Тариф за доставку (default 150 руб.) |
| `freeDeliveryFrom` | Бесплатная доставка от суммы (default 1500 руб.) |

### Роли AdminUser
| Роль | Описание |
|------|----------|
| `superadmin` | Доступ ко всем дарксторам, управление всей системой |
| `admin` | Администратор назначенных дарксторов |
| `manager` | Менеджер с ограниченными правами по разделам |

---

## Backend: Защита и фильтрация

### AdminGuard (`src/admin/admin.guard.ts`)
1. Проверяет JWT-токен (sub, email, role)
2. Проверяет роли через `@Roles()` декоратор (Reflector)
3. Читает заголовок `X-Darkstore-Id`
4. Для superadmin — пропускает, устанавливает `req.darkstoreId`
5. Для admin/manager — проверяет доступ через таблицу `AdminUserDarkstore`
6. Устанавливает `req.user` и `req.darkstoreId`

### Паттерн фильтрации в контроллерах
```typescript
const where: any = {};
if (req?.darkstoreId) where.darkstoreId = req.darkstoreId;
// Суперадмин без X-Darkstore-Id видит все данные
```

### Статус контроллеров

| Контроллер | Guard | Фильтрация | Создание | Обновление/Удаление | Статус |
|------------|-------|-----------|----------|---------------------|--------|
| `admin-darkstores` | AdminGuard + @Roles('superadmin') | По доступу | ✅ | ✅ | ✅ OK |
| `admin-auth` (login/me) | JwtGuard (login=none) | — | — | — | ✅ OK |
| `admin-auth` (users CRUD) | AdminGuard + @Roles | darkstores в ответе | darkstoreIds | darkstoreIds | ✅ OK |
| `admin-orders` | AdminGuard | ✅ List + getById | — | ✅ Проверка владельца | ✅ OK |
| `admin-products` | AdminGuard | ✅ через DarkstoreProduct | ✅ глобально + DarkstoreProduct | ✅ Обновление DarkstoreProduct | ✅ OK |
| `admin-categories` | AdminGuard | ✅ List + checkSlug | ✅ parentId (глобальные) | ✅ Toggle через DarkstoreCategory | ✅ OK |
| `admin-promotions` | AdminGuard | ✅ List + getById | ✅ darkstoreId | ✅ Проверка владельца | ✅ OK |
| `admin-purchases` | AdminGuard | ✅ List | ✅ darkstoreId | — | ✅ OK |
| `admin-expiry` | AdminGuard | ✅ Через purchase.darkstoreId | — | ✅ WriteOff + discountPercent | ✅ OK |
| `admin-analytics` | AdminGuard | ✅ darkstoreFilter | — | — | ✅ OK |
| `admin-clients` | AdminGuard | ✅ По заказам в дарксторе | — | — (read-only) | ✅ OK |
| `admin-couriers` | AdminGuard | ✅ List | ✅ darkstoreId | ✅ Проверка владельца | ✅ OK |
| `admin-delivery-zones` | AdminGuard | ✅ List | ✅ darkstoreId | ✅ Проверка владельца | ✅ OK |
| `admin-server` | AdminGuard + @Roles | N/A | — | — | ✅ OK |

### Клиентские контроллеры

| Контроллер | Механизм | Статус |
|------------|---------|--------|
| `catalog` (categories) | `?settlement=` → resolveDarkstoreId() → фильтрация | ✅ OK |
| `catalog` (subcategories) | `GET /categories/:slug/subcategories?settlement=` | ✅ OK |
| `catalog` (products) | settlement → darkstoreId → DarkstoreProduct: цены, остатки | ✅ OK |
| `orders` | settlement → DeliveryZone → darkstoreId на заказе | ✅ OK |
| `cart` | darkstoreId nullable, не фильтруется | ✅ OK (корзина глобальная) |
| `courier-*` | Фильтрация по courierId (каждый курьер привязан к darkstore) | ✅ OK |
| `chat`, `events`, `push`, `upload`, `auth` | Без изменений, работают через связанные сущности | ✅ OK |

---

## Frontend: Изменения

### Типы (`features/admin/types.ts`)
- `Darkstore`: id, name, shortName?, address?, isActive, createdAt, updatedAt
- `AdminUser.role`: `'superadmin' | 'admin' | 'manager'`
- `AdminUser.darkstores?: Darkstore[]`
- `Product` включает поля из `DarkstoreProduct`: `price`, `oldPrice`, `purchasePrice`, `stock`, `cellNumber`, `maxPerOrder`, `darkstoreProductId`, `isActiveInDarkstore`
- `Order` включает экономику: `purchaseCost`, `courierCost`, `profit`, `settlement`, `customerLatitude`, `customerLongitude`, `canceledBy`, `cancelReason`, `statusHistory[]`
- `DeliveryZone` включает `settlementTitle`, `deliveryFee`, `freeDeliveryFrom`

### HTTP клиент (`shared/api/http.ts`)
- `getAdminDarkstoreId()` / `setAdminDarkstoreId()` — localStorage
- `X-Darkstore-Id` заголовок автоматически инжектится для admin путей в `apiRequest()` и `apiUpload()`

### API (`features/admin/api.ts`)
- `LoginResponse` включает `darkstores: Darkstore[]`
- `createUser` / `updateUser` — роль `'superadmin'`, поле `darkstoreIds`
- `adminDarkstoresApi` — CRUD для дарксторов (create/update с `shortName`, `address`)
- `adminProductsApi` — работает с глобальными Product + DarkstoreProduct (flattenProduct на бэкенде)
- `adminClientsApi` — `getClients(page, limit, search, sortBy)`, `getClient(id)` — read-only

### Провайдер (`components/admin/AdminProvider.tsx`)
- Контекст расширен: `darkstores`, `currentDarkstore`, `switchDarkstore`, `refreshDarkstores`
- При логине/checkAuth загружаются дарксторы из ответа API
- Выбранный даркстор сохраняется в localStorage
- `hasPermission`: superadmin и admin имеют полный доступ
- `refreshDarkstores()`: перезагрузка списка дарксторов (используется после CRUD операций)

### Layout (`app/admin/layout.tsx`)
- Переключатель дарксторов в шапке (dropdown при >1 дарксторе)
- Навигация: добавлен пункт «Дарксторы» (секция «Управление»)
- Роль в профиле: «Суперадмин» / «Администратор» / «Менеджер»
- `ALL_SECTIONS` включает `darkstores`

### Страницы

| Страница | Статус | Описание |
|---------|--------|----------|
| `admin/darkstores/page.tsx` | ✅ | CRUD дарксторов (только суперадмин) |
| `admin/users/page.tsx` | ✅ | Роль superadmin в select, мультивыбор дарксторов, колонка «Дарксторы» |
| `admin/products/page.tsx` | ✅ | Работает через DarkstoreProduct; отображает цены, остатки, ячейку, maxPerOrder |
| `admin/catalog/page.tsx` | ✅ | Категории с поддержкой подкатегорий и markupPercent |
| `admin/orders/page.tsx` | ✅ | Показывает экономику заказа, историю статусов, геопозицию клиента |
| `admin/expiry/page.tsx` | ✅ | Списания (WriteOff) и скидки на партии (discountPercent) |
| `admin/clients/page.tsx` | ✅ | Список клиентов с поиском, сортировкой, метриками и бейджами активности |
| `admin/clients/[id]/page.tsx` | ✅ | Профиль клиента: сегмент, LTV, топ товаров, история заказов |
| `admin/login/page.tsx` | ✅ | Через AdminProvider.login() |
| Остальные admin страницы | ✅ | Данные автоматически фильтруются через X-Darkstore-Id |

---

## Миграции

### `20260326120000_add_darkstore_model`
1. Создаёт таблицу `Darkstore`
2. Создаёт дефолтный даркстор `'default-darkstore'`
3. Добавляет `darkstoreId` во все таблицы
4. Бэкфиллит существующие данные на `'default-darkstore'`
5. Создаёт таблицу `AdminUserDarkstore`
6. Привязывает всех существующих AdminUser к дефолтному даркстору

### Последующие миграции
- `add_darkstore_product` — создаёт модель `DarkstoreProduct`, переводит Product на глобальную схему
- `add_order_economics` — добавляет `purchaseCost`, `courierCost`, `profit` в Order
- `add_order_status_history` — создаёт `OrderStatusHistory`
- `add_category_markup` — добавляет `markupPercent` и `parentId` в Category
- `add_batch_discount` — добавляет `discountPercent` в Batch
- `add_writeoff` — создаёт модель `WriteOff`
- `add_max_per_order` — добавляет `maxPerOrder` в `DarkstoreProduct`
- `add_global_categories` — категории глобальные (`slug @unique`), создана `DarkstoreCategory` (привязка Category ↔ Darkstore, `isActive` per darkstore)

> Раздел «Клиенты» не требует миграций — он агрегирует данные из существующих таблиц `User` и `Order`.

---

## Паттерн проверки владельца

Все операции update/delete над сущностями проверяют принадлежность к даркстору:

```typescript
// Если req.darkstoreId установлен (не суперадмин) — проверяем владельца
if (req.darkstoreId && entity.darkstoreId !== req.darkstoreId) {
  throw new BadRequestException('Not found');
}
```

Суперадмин без `X-Darkstore-Id` может оперировать любыми сущностями.

## Фильтрация в admin-expiry

Batch не имеет прямого `darkstoreId`. Фильтрация через связь:

```typescript
{ purchase: { darkstoreId: req.darkstoreId } }
```

---

## Архитектура товаров (DarkstoreProduct)

```
Product (глобальный)
  id, title, slug (@unique), description, imageUrl, weight, barcode
  categoryId?, subcategoryId?  ← глобальные категории по умолчанию

DarkstoreProduct (per-darkstore)
  productId + darkstoreId (@@unique)
  price, oldPrice, purchasePrice
  stock, cellNumber, maxPerOrder
  categoryId?, subcategoryId?  ← категории в этом дарксторе
  isActive
```

Бэкенд возвращает «плоский» объект через хелпер `flattenProduct()`:
- данные из DarkstoreProduct перекрывают поля Product
- добавляются `darkstoreProductId` и `isActiveInDarkstore`

---

## Экономика заказа

```
Order.profit = Order.totalAmount − Order.purchaseCost − Order.courierCost
```

- `purchaseCost` — сумма `(purchasePrice × qty)` по позициям заказа
- `courierCost` — `DeliveryZone.deliveryFee` населённого пункта заказа
- Аналитика (`admin-analytics`) агрегирует по этим полям только для `DELIVERED` заказов

---

## Раздел «Клиенты» (`admin-clients`)

### Концепция

`User` — глобальная сущность (не привязана к даркстору). Клиентская аналитика вычисляется на основе заказов.

Если выбран даркстор (`X-Darkstore-Id`), отображаются только клиенты, имеющие хотя бы один заказ в этом дарксторе, а все метрики считаются по заказам только этого даркстора.

### Эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| `GET` | `/v1/admin/clients` | Список клиентов с агрегатами |
| `GET` | `/v1/admin/clients/:id` | Профиль клиента |

**Query-параметры списка:**
| Параметр | Тип | Описание |
|----------|-----|----------|
| `page` | number | Страница (default 1) |
| `limit` | number | Размер страницы (default 20) |
| `search` | string | Поиск по имени, телефону, email, логину |
| `sortBy` | string | `lastOrder` \| `totalSpent` \| `totalOrders` \| `createdAt` |

### Данные в профиле клиента

```
user           — базовые данные (login, name, phone, email, settlement, addressLine, createdAt)
stats          — агрегированная статистика
  totalOrders          — все заказы (любой статус)
  deliveredOrders      — доставленные
  canceledOrders       — отменённые
  totalSpent           — сумма по доставленным заказам
  totalDeliveryFee     — сумма стоимости доставки
  avgOrderValue        — средний чек
  firstOrderAt         — дата первого заказа
  lastOrderAt          — дата последнего заказа
  daysSinceLastOrder   — дней с последнего заказа (recency)
  daysSinceRegistration— дней с первого заказа
  statusBreakdown[]    — разбивка по статусам
topProducts[]  — топ-5 товаров по qty из доставленных заказов
recentOrders[] — последние 30 заказов
```

### Сегментация клиентов

| Сегмент | Условие |
|---------|----------|
| VIP | ≥ 10 доставленных заказов И суммарные траты ≥ 10 000 ₽ |
| Постоянный | ≥ 5 доставленных заказов |
| Returning | ≥ 2 доставленных заказа |
| Новичок | < 2 доставленных заказа |

### Статус активности (Recency)

| Бейдж | Условие |
|-------|---------|
| Активен | ≤ 7 дней с последнего заказа |
| Недавно | ≤ 30 дней |
| Засыпает | ≤ 90 дней |
| Неактивен | > 90 дней |

### Типы Frontend

```typescript
ClientListItem  — данные строки таблицы
ClientDetail    — полный профиль (user + stats + topProducts[] + recentOrders[])
```

Оба типа экспортируются из `features/admin/types.ts`.
