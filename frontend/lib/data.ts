// Categories
export const categories = [
  { id: 1, name: 'Что нового', slug: 'chto-novogo' },
  { id: 2, name: 'Что на завтрак?', slug: 'chto-na-zavtrak' },
  { id: 3, name: 'Время обеда', slug: 'vremya-obeda' },
  { id: 4, name: 'Маленькие радости', slug: 'malenkie-radosti' },
  { id: 5, name: 'Вкусы со всего мира', slug: 'vkusy-so-vsego-mira' },
  { id: 6, name: 'Можно в пост', slug: 'mozhno-v-post' },
  { id: 7, name: 'Тяжёлый люкс', slug: 'tyazhyolyy-lyuks' },
  { id: 8, name: 'Это мне надо!', slug: 'eto-mne-nado-2' },
  { id: 9, name: 'На вкус и цвет', slug: 'na-vkus-i-tsvet' },
  { id: 10, name: 'Весеннее настроение', slug: 'vesennee-nastroenie' },
  { id: 11, name: 'Новое и популярное', slug: 'novoe-i-populyarnoe' },
  { id: 12, name: 'Молочное и сыр', slug: 'molochnoe-i-syr' },
  { id: 13, name: 'Бакалея, мясо и рыба', slug: 'bakaleya-myaso-i-ryba' },
  { id: 14, name: 'Готовая еда и выпечка', slug: 'gotovaya-eda-i-vypechka' },
  { id: 15, name: 'Мороженое, сладкое и снеки', slug: 'morozhenoe-sladkoe-i-sneki' },
  { id: 16, name: 'Вода и напитки', slug: 'voda-i-napitki-1' },
  { id: 17, name: 'Бытовая химия и уход', slug: 'bytovaya-khimiya-i-ukhod' },
];

// Product type
export interface Product {
  id: string;
  title: string;
  price: number;
  discountPrice?: number;
  discountPercent?: number;
  imageUrl: string;
  weight: string;
  category: string;
  rating?: number;
}

// Sample products
export const products: Product[] = [
  {
    id: '33934ccb-96bb-11ea-bc7d-0050560306e1',
    title: 'Молоко, 3,2%, бутылка, 950 мл',
    price: 99,
    imageUrl: 'https://ext.same-assets.com/2507829798/4179985199.jpeg',
    weight: '950 мл',
    category: 'molochnoe-i-syr',
    rating: 4.8,
  },
  {
    id: '344d24df-99a8-11ea-bc7d-0050560306e1',
    title: 'Молоко, 2,5%, бутылка, 950 мл',
    price: 94,
    imageUrl: 'https://ext.same-assets.com/2507829798/2159820780.jpeg',
    weight: '950 мл',
    category: 'molochnoe-i-syr',
    rating: 4.9,
  },
  {
    id: '38ee8d70-46b3-11eb-85a3-1c34dae33151',
    title: 'Молоко, 1%, бутылка, 900 мл',
    price: 85,
    imageUrl: 'https://ext.same-assets.com/2507829798/2609030775.jpeg',
    weight: '900 мл',
    category: 'molochnoe-i-syr',
    rating: 4.7,
  },
  {
    id: '0ffda4b2-6e59-11e9-80c5-0cc47a817925',
    title: 'Энергетик Adrenaline Rush, 0,449 л',
    price: 129,
    imageUrl: 'https://ext.same-assets.com/2507829798/2246790842.jpeg',
    weight: '0,449 л',
    category: 'voda-i-napitki-1',
    rating: 4.5,
  },
  {
    id: '96606336-a9ca-11eb-85ab-1c34dae33151',
    title: 'Ряженка, 2%, 200 мл',
    price: 115,
    discountPrice: 95,
    discountPercent: 17,
    imageUrl: 'https://ext.same-assets.com/2507829798/1248308813.jpeg',
    weight: '200 мл',
    category: 'molochnoe-i-syr',
    rating: 4.6,
  },
  {
    id: 'eafbd340-a99e-11ec-ae6d-08c0eb320147',
    title: 'Чипсы Lay\'s, сметана-лук, 140 г',
    price: 199,
    imageUrl: 'https://ext.same-assets.com/2507829798/4015869825.jpeg',
    weight: '140 г',
    category: 'morozhenoe-sladkoe-i-sneki',
    rating: 4.9,
  },
  {
    id: '8716584d-4c98-11ee-885f-08c0eb32014b',
    title: 'Сыр творожный, сливочный, 2 шт.',
    price: 325,
    discountPrice: 259,
    discountPercent: 20,
    imageUrl: 'https://ext.same-assets.com/2507829798/1536272203.jpeg',
    weight: '2 шт.',
    category: 'molochnoe-i-syr',
    rating: 4.7,
  },
  {
    id: 'f1357119-7883-11e9-80c5-0cc47a817925',
    title: 'Бананы, 1 кг.',
    price: 139,
    discountPrice: 109,
    discountPercent: 21,
    imageUrl: 'https://ext.same-assets.com/2507829798/2021585618.jpeg',
    weight: '1 кг.',
    category: 'frukty-i-yagody-1',
    rating: 4.8,
  },
  {
    id: '790e6fe3-02cb-11e9-80c5-0cc47a817925',
    title: 'Туалетная бумага Zewa Deluxe, 3 слоя, 8 рулонов',
    price: 405,
    discountPrice: 249,
    discountPercent: 38,
    imageUrl: 'https://ext.same-assets.com/2507829798/1744151014.jpeg',
    weight: '8 рулонов',
    category: 'bytovaya-khimiya-i-ukhod',
    rating: 4.9,
  },
  {
    id: '288b7cfc-0d77-4b7b-9ea3-c2bd25161c22',
    title: 'Креветки: королевские тигровые, варено-мороженые, 90/110, 500 г',
    price: 949,
    discountPrice: 799,
    discountPercent: 15,
    imageUrl: 'https://ext.same-assets.com/2507829798/1339315204.jpeg',
    weight: '500 г',
    category: 'bakaleya-myaso-i-ryba',
    rating: 4.7,
  },
  {
    id: '3c9f28c1-0a06-11eb-8599-1c34dae33151',
    title: 'Салат, греческий, с сыром фета, заправкой, 250 г',
    price: 239,
    discountPrice: 155,
    discountPercent: 35,
    imageUrl: 'https://ext.same-assets.com/2507829798/848669311.jpeg',
    weight: '250 г',
    category: 'gotovaya-eda-i-vypechka',
    rating: 4.6,
  },
  {
    id: 'c8e617c3-0a1a-11eb-8599-1c34dae33151',
    title: 'Хлеб ремесленный, бездрожжевой, 420 г',
    price: 175,
    imageUrl: 'https://ext.same-assets.com/2507829798/807649583.jpeg',
    weight: '420 г',
    category: 'gotovaya-eda-i-vypechka',
    rating: 4.5,
  },
];

// Promotions
export interface Promotion {
  id: string;
  title: string;
  imageUrl: string;
  url: string;
}

export const promotions: Promotion[] = [
  {
    id: 'f0243724-4fbd-4e11-9c89-206fca76f108',
    title: 'Скидки до 15%',
    imageUrl: 'https://ext.same-assets.com/2507829798/479018618.jpeg',
    url: '/promo/f0243724-4fbd-4e11-9c89-206fca76f108',
  },
  {
    id: 'f519a116-6980-49ee-9acb-05bfff4d69a0',
    title: 'Готовимся к посту',
    imageUrl: 'https://ext.same-assets.com/2507829798/1775732981.jpeg',
    url: '/promo/f519a116-6980-49ee-9acb-05bfff4d69a0',
  },
  {
    id: 'bdf70f99-b320-430c-80a9-7e5f98779991',
    title: 'Время вареников: с мясом и без',
    imageUrl: 'https://ext.same-assets.com/2507829798/2135369902.jpeg',
    url: '/promo/bdf70f99-b320-430c-80a9-7e5f98779991',
  },
  {
    id: 'cc9ee270-75fc-4053-9852-db489a927c6e',
    title: 'Фрукты со всего мира',
    imageUrl: 'https://ext.same-assets.com/2507829798/688317009.jpeg',
    url: '/promo/cc9ee270-75fc-4053-9852-db489a927c6e',
  },
];
