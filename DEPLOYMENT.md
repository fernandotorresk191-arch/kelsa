# 🚀 Развертывание Backoffice

## Структура проекта

```
kelsa/
├── frontend/                 # Next.js приложение (основной сайт + админ)
│   ├── app/
│   │   ├── page.tsx         # Главная страница сайта
│   │   ├── admin/
│   │   │   ├── layout.tsx   # Layout для админа
│   │   │   ├── login/
│   │   │   │   └── page.tsx # Страница входа в админ
│   │   │   ├── page.tsx     # Панель управления (Dashboard)
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx # Список заказов
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx # Деталь заказа
│   │   │   ├── products/
│   │   │   │   ├── page.tsx # Список товаров
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx # Редактирование товара
│   │   │   └── analytics/
│   │   │       └── page.tsx # Аналитика и отчеты
│   │   └── (другие маршруты для клиентского приложения)
│   ├── components/
│   │   ├── admin/
│   │   │   └── AdminProvider.tsx # Контекст для админа
│   │   └── (другие компоненты)
│   ├── features/
│   │   ├── admin/
│   │   │   ├── api.ts       # API клиент для админ эндпоинтов
│   │   │   └── types.ts     # TypeScript типы для админа
│   │   └── (другие фичи)
│   └── package.json
│
├── backend/
│   └── api/
│       ├── src/
│       │   ├── admin/
│       │   │   ├── admin-auth.controller.ts      # Логин для админов
│       │   │   ├── admin-orders.controller.ts    # Управление заказами
│       │   │   ├── admin-products.controller.ts  # Управление товарами
│       │   │   ├── admin-categories.controller.ts # Каталог (глобальные + DarkstoreCategory)
│       │   │   ├── admin-clients.controller.ts   # Клиенты: LTV, сегментация
│       │   │   ├── admin-analytics.controller.ts # Аналитика
│       │   │   └── admin.module.ts               # Модуль админа (17 файлов)
│       │   ├── app.module.ts                     # Главный модуль с AdminModule
│       │   └── (другие модули)
│       ├── prisma/
│       │   ├── schema.prisma       # 24 модели, 6 enum-ов (Prisma 7.2)
│       │   └── migrations/         # 26 миграций БД
│       └── package.json
│
└── BACKOFFICE_GUIDE.md     # Руководство пользователя для админа
```

---

## 🛠️ Установка и настройка

### Требования

- Node.js 18+
- PostgreSQL 12+
- npm или yarn

### 1. Обновление бэкэнда

```bash
cd backend/api

# Установка зависимостей
npm install

# Применить миграцию к БД
npx prisma migrate deploy

# Или если это первый запуск
npx prisma migrate dev

# Сгенерировать Prisma Client
npx prisma generate
```

### 2. Создание администратора в БД

Подключитесь к БД PostgreSQL и выполните:

```sql
-- Создаем первого администратора
INSERT INTO "AdminUser" (id, email, "passwordHash", role, "isActive", "createdAt", "updatedAt")
VALUES (
  'admin_1',
  'admin@gokelsa.ru',
  '$2b$10$...',  -- Хэш пароля (см. ниже как создать)
  'admin',
  true,
  NOW(),
  NOW()
);
```

#### Как создать хэш пароля?

Запустите Node.js и выполните:

```javascript
const bcrypt = require('bcrypt');

// Создать хэш для пароля "AdminPassword123"
bcrypt.hash('AdminPassword123', 10).then(hash => {
  console.log(hash);
  // Скопируйте вывод и вставьте в SQL запрос выше
});
```

Или используйте готовый сервис: https://bcrypt-generator.com/

### 3. Запуск бэкэнда

```bash
cd backend/api
npm run start:dev
```

Бэкэнд будет доступен на `http://localhost:3001`

### 4. Запуск фронтэнда

```bash
cd frontend
npm run dev
```

Фронтэнд будет доступен на `http://localhost:3000`

---

## 🔌 API Эндпоинты Админа

### Аутентификация

```
POST /v1/admin-auth/login
Параметры: { email, password }
Возвращает: { admin: {...}, accessToken }

GET /v1/admin-auth/me
Требует: JWT Token
Возвращает: { id, email, role, isActive }

POST /v1/admin-auth/create
Требует: JWT Token с ролью 'admin'
Параметры: { email, password, role }
Возвращает: { id, email, role, isActive }
```

### Заказы

```
GET /v1/admin/orders?page=1&limit=20&status=NEW
Требует: JWT Token
Возвращает: { data: Order[], pagination: {...} }

GET /v1/admin/orders/:id
Требует: JWT Token
Возвращает: Order (полная информация)

PATCH /v1/admin/orders/:id/status
Требует: JWT Token
Параметры: { status, comment? }
Возвращает: { success, history }

GET /v1/admin/orders/:id/print/invoice
Требует: JWT Token
Возвращает: { html, fileName }
```

### Товары

```
GET /v1/admin/products?page=1&limit=20
Требует: JWT Token
Возвращает: { data: Product[], pagination: {...} }

GET /v1/admin/products/:id
Требует: JWT Token
Возвращает: Product

POST /v1/admin/products
Требует: JWT Token
Параметры: { title, slug, description?, price, stock, imageUrl?, categoryId? }
Возвращает: Product

PUT /v1/admin/products/:id
Требует: JWT Token
Параметры: { title?, slug?, description?, price?, stock?, imageUrl?, isActive? }
Возвращает: Product

DELETE /v1/admin/products/:id
Требует: JWT Token
Возвращает: { success, message }

PATCH /v1/admin/products/:id/stock
Требует: JWT Token
Параметры: { quantity }
Возвращает: { success, stock }
```

### Аналитика

```
GET /v1/admin/analytics/dashboard
Требует: JWT Token
Возвращает: { overview, ordersByStatus, recentOrders, topProducts }

GET /v1/admin/analytics/orders-stats?startDate=...&endDate=...
Требует: JWT Token
Возвращает: { period, totalOrders, totalRevenue, byDate }

GET /v1/admin/analytics/products-sales?limit=20
Требует: JWT Token
Возвращает: { data: {...} }

GET /v1/admin/analytics/revenue-analytics?period=month
Требует: JWT Token
Возвращает: { period, data }
```

---

## 🌐 Настройка на Production

### 1. Переменные окружения

**backend/api/.env:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/kelsa"
JWT_SECRET="your-secret-key-change-me"
NODE_ENV="production"
```

**frontend/.env.local:**
```env
NEXT_PUBLIC_API_URL="https://api.gokelsa.ru"
NEXT_PUBLIC_ADMIN_API_URL="https://api.gokelsa.ru"
```

### 2. NGINX конфигурация

```nginx
# Основной сайт + админ (один Next.js)
upstream nextjs {
  server 127.0.0.1:3000;
}

# Бэкэнд API
upstream api {
  server 127.0.0.1:3001;
}

# Основной домен
server {
  listen 80;
  server_name gokelsa.ru www.gokelsa.ru;

  # API маршруты
  location /v1/ {
    proxy_pass http://api;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Всё остальное идёт на Next.js (включая /admin)
  location / {
    proxy_pass http://nextjs;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

# Поддомен для админа (опционально, может быть на том же сервере)
server {
  listen 80;
  server_name bo.gokelsa.ru;

  # API маршруты
  location /v1/ {
    proxy_pass http://api;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Всё остальное (включая /admin/...) идёт на Next.js
  location / {
    proxy_pass http://nextjs;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### 3. Docker Compose

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: kelsa
      POSTGRES_USER: kelsa_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build: ./backend/api
    environment:
      DATABASE_URL: "postgresql://kelsa_user:secure_password@db:5432/kelsa"
      JWT_SECRET: "your-secret-key"
      NODE_ENV: "production"
    ports:
      - "3001:3001"
    depends_on:
      - db

  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: "http://api:3001"
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  postgres_data:
```

---

## ✅ Чек-лист развертывания

- [ ] Обновлена Prisma схема (`schema.prisma`)
- [ ] Применена миграция БД
- [ ] Созданы администраторы в таблице `AdminUser`
- [ ] Бэкэнд запущен и доступен
- [ ] Фронтэнд запущен и доступен
- [ ] JWT Token генерируется при логине
- [ ] Страница /admin/login открывается
- [ ] Логин работает с созданным администратором
- [ ] Dashboard загружается и показывает статистику
- [ ] Можно просматривать и редактировать заказы
- [ ] Можно создавать и редактировать товары
- [ ] Аналитика показывает данные
- [ ] Печать накладной работает
- [ ] SSL сертификат установлен на production
- [ ] DNS настроен для `bo.gokelsa.ru`

---

## 🐛 Debugging

### Проверить логи бэкэнда

```bash
cd backend/api
npm run start:dev  # Логи будут в консоли
```

### Проверить логи фронтэнда

```bash
cd frontend
npm run dev  # Логи будут в консоли
```

### Проверить, что бэкэнд запущен

```bash
curl http://localhost:3001/health
```

### Проверить, что JWT генерируется

```bash
curl -X POST http://localhost:3001/v1/admin-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gokelsa.ru","password":"AdminPassword123"}'
```

---

**Версия:** 1.0  
**Последнее обновление:** 20 января 2026
