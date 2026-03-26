# Архитектура мультитенантности: Дарксторы

## Концепция

Каждый даркстор — изолированная единица со своими менеджерами, заказами, товарами, категориями, баннерами, закупками, партиями, курьерами, зонами доставки и аналитикой. Суперадмин создаёт дарксторы и назначает персонал.

Пользователи (покупатели) — глобальные. Даркстор определяется по населённому пункту (settlement → DeliveryZone → darkstoreId).

---

## Схема базы данных

### Новые модели
| Модель | Описание |
|--------|----------|
| `Darkstore` | id (cuid), name, address?, isActive, createdAt, updatedAt |
| `AdminUserDarkstore` | Связь M:N между AdminUser и Darkstore (adminUserId + darkstoreId) |

### Поле `darkstoreId` добавлено в модели:
| Модель | Обязательность | Примечание |
|--------|---------------|------------|
| Category | required | @@unique([slug, darkstoreId]) |
| Product | required | @@unique([slug, darkstoreId]) |
| Promotion | required | |
| Order | required | |
| DeliveryZone | required | Связывает settlement → darkstore |
| Purchase | required | |
| Batch | required (через Purchase) | |
| Courier | required | |
| Cart | optional (nullable) | Назначается при оформлении заказа |

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
| `admin-products` | AdminGuard | ✅ List + checkSlug | ✅ darkstoreId | ✅ Проверка владельца | ✅ OK |
| `admin-categories` | AdminGuard | ✅ List + checkSlug | ✅ darkstoreId | ✅ Проверка владельца | ✅ OK |
| `admin-promotions` | AdminGuard | ✅ List + getById | ✅ darkstoreId | ✅ Проверка владельца | ✅ OK |
| `admin-purchases` | AdminGuard | ✅ List | ✅ darkstoreId | — | ✅ OK |
| `admin-expiry` | AdminGuard | ✅ Через purchase.darkstoreId | — | — | ✅ OK |
| `admin-analytics` | AdminGuard | ✅ darkstoreFilter | — | — | ✅ OK |
| `admin-couriers` | AdminGuard | ✅ List | ✅ darkstoreId | ✅ Проверка владельца | ✅ OK |
| `admin-delivery-zones` | AdminGuard | ✅ List | ✅ darkstoreId | ✅ Проверка владельца | ✅ OK |
| `admin-server` | AdminGuard + @Roles | N/A | — | — | ✅ OK |

### Клиентские контроллеры

| Контроллер | Механизм | Статус |
|------------|---------|--------|
| `catalog` | `?settlement=` → resolveDarkstoreId() → фильтрация | ✅ OK |
| `orders` | settlement → DeliveryZone → darkstoreId на заказе | ✅ OK |
| `cart` | darkstoreId nullable, не фильтруется | ✅ OK (корзина глобальная) |
| `courier-*` | Фильтрация по courierId (каждый курьер привязан к darkstore) | ✅ OK |
| `chat`, `events`, `push`, `upload`, `auth` | Без изменений, работают через связанные сущности | ✅ OK |

---

## Frontend: Изменения

### Типы (`features/admin/types.ts`)
- Добавлен тип `Darkstore` (id, name, address, isActive, createdAt, updatedAt)
- `AdminUser.role` расширен: `'superadmin' | 'admin' | 'manager'`
- `AdminUser.darkstores?: Darkstore[]`

### HTTP клиент (`shared/api/http.ts`)
- `getAdminDarkstoreId()` / `setAdminDarkstoreId()` — localStorage
- `X-Darkstore-Id` заголовок автоматически инжектится для admin путей в `apiRequest()` и `apiUpload()`

### API (`features/admin/api.ts`)
- `LoginResponse` включает `darkstores: Darkstore[]`
- `createUser` / `updateUser` — роль `'superadmin'`, поле `darkstoreIds`
- Новый `adminDarkstoresApi` — CRUD для дарксторов

### Провайдер (`components/admin/AdminProvider.tsx`)
- Контекст расширен: `darkstores`, `currentDarkstore`, `switchDarkstore`
- При логине/checkAuth загружаются дарксторы из ответа API
- Выбранный даркстор сохраняется в localStorage
- `hasPermission`: superadmin и admin имеют полный доступ

### Layout (`app/admin/layout.tsx`)
- Переключатель дарксторов в шапке (dropdown при >1 дарксторе)
- Навигация: добавлен пункт «Дарксторы» (секция «Управление»)
- Роль в профиле: «Суперадмин» / «Администратор» / «Менеджер»
- `ALL_SECTIONS` включает `darkstores`

### Страницы

| Страница | Статус | Описание |
|---------|--------|----------|
| `admin/darkstores/page.tsx` | ✅ НОВАЯ | CRUD дарксторов (только суперадмин) |
| `admin/users/page.tsx` | ✅ ОБНОВЛЕНА | Роль superadmin в select, мультивыбор дарксторов, колонка «Дарксторы» |
| `admin/login/page.tsx` | ✅ OK | Используется через AdminProvider.login() |
| Остальные admin страницы | ✅ OK | Данные автоматически фильтруются через X-Darkstore-Id |

---

## Миграция (`20260326120000_add_darkstore_model`)

1. Создаёт таблицу `Darkstore`
2. Создаёт дефолтный даркстор `'default-darkstore'`
3. Добавляет `darkstoreId` во все таблицы
4. Бэкфиллит существующие данные на `'default-darkstore'`
5. Создаёт таблицу `AdminUserDarkstore`
6. Привязывает всех существующих AdminUser к дефолтному даркстору

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
