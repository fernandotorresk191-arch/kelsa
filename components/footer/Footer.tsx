import Link from 'next/link';
import { FiPhone, FiMail, FiInstagram, FiTwitter, FiFacebook, FiYoutube } from 'react-icons/fi';

const Footer = () => {
  return (
    <footer className="bg-white border-t py-8">
      <div className="samokat-container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1 - About */}
          <div>
            <h3 className="font-semibold text-base mb-4">О компании</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-sm hover:text-primary transition-colors">
                  О нас
                </Link>
              </li>
              <li>
                <Link href="/career" className="text-sm hover:text-primary transition-colors">
                  Вакансии
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-sm hover:text-primary transition-colors">
                  Блог
                </Link>
              </li>
              <li>
                <Link href="/coverage" className="text-sm hover:text-primary transition-colors">
                  Зона доставки
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2 - Business */}
          <div>
            <h3 className="font-semibold text-base mb-4">Бизнесу</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/b2b" className="text-sm hover:text-primary transition-colors">
                  Корпоративным клиентам
                </Link>
              </li>
              <li>
                <Link href="/franchise" className="text-sm hover:text-primary transition-colors">
                  Франшиза
                </Link>
              </li>
              <li>
                <Link href="/suppliers" className="text-sm hover:text-primary transition-colors">
                  Поставщикам
                </Link>
              </li>
              <li>
                <Link href="/partners" className="text-sm hover:text-primary transition-colors">
                  Партнерская программа
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3 - Help */}
          <div>
            <h3 className="font-semibold text-base mb-4">Помощь</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/faq" className="text-sm hover:text-primary transition-colors">
                  Вопросы и ответы
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm hover:text-primary transition-colors">
                  Условия обслуживания
                </Link>
              </li>
              <li>
                <Link href="/return" className="text-sm hover:text-primary transition-colors">
                  Возврат и обмен
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm hover:text-primary transition-colors">
                  Политика конфиденциальности
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4 - Contact */}
          <div>
            <h3 className="font-semibold text-base mb-4">Связаться с нами</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm">
                <FiPhone size={16} className="text-primary" />
                <a href="tel:+78005553535" className="hover:text-primary transition-colors">
                  8 800 555-35-35
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <FiMail size={16} className="text-primary" />
                <a href="mailto:info@nevre.ru" className="hover:text-primary transition-colors">
                  info@nevre.ru
                </a>
              </li>
            </ul>

            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Мобильное приложение</h4>
              <div className="flex gap-2">
                <Link href="https://apps.apple.com" target="_blank" rel="noopener noreferrer">
                  <div className="bg-black text-white px-3 py-2 rounded-md text-xs flex items-center gap-1">
                    <span>App Store</span>
                  </div>
                </Link>
                <Link href="https://play.google.com" target="_blank" rel="noopener noreferrer">
                  <div className="bg-black text-white px-3 py-2 rounded-md text-xs flex items-center gap-1">
                    <span>Google Play</span>
                  </div>
                </Link>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <Link href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <FiInstagram size={20} />
              </Link>
              <Link href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <FiFacebook size={20} />
              </Link>
              <Link href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <FiTwitter size={20} />
              </Link>
              <Link href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                <FiYoutube size={20} />
              </Link>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t mt-8 pt-6 text-xs text-muted-foreground">
          <p>© 2025 Самокат. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
