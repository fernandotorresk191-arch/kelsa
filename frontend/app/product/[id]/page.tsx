import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "../../../components/ui/badge";
import { catalogApi } from "../../../features/catalog/api";
import { resolveMediaUrl } from "../../../shared/api/media";
import { ProductActions } from "../../../components/product/ProductActions";
import { ProductImage } from "../../../components/product/ProductImage";
import { BackButton } from "../../../components/product/BackButton";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);

  // Fetch a chunk of products and locate the one by id.
  const allProducts = await catalogApi.products({ limit: 500, offset: 0 });
  const product = allProducts.find((p) => p.id === decodedId);

  if (!product) {
    notFound();
  }

  const imageUrl = resolveMediaUrl(product.imageUrl);
  const hasDiscount = (product.oldPrice ?? 0) > product.price;
  const discountPercent =
    hasDiscount && product.oldPrice
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null;

  const relatedProducts =
    product.category?.slug
      ? (await catalogApi.products({ categorySlug: product.category.slug, limit: 8, offset: 0 }))
          .filter((p) => p.id !== product.id)
      : allProducts.filter((p) => p.id !== product.id).slice(0, 8);

  return (
    <div className="kelsa-container py-6">
      {/* Breadcrumb / back */}
      <div className="flex items-center mb-6">
        <BackButton />
      </div>

      {/* Product details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product image with cart badge */}
        <ProductImage
          productId={product.id}
          imageUrl={imageUrl}
          title={product.title}
          discountPercent={discountPercent}
        />

        {/* Product info */}
        <div>
          <h1 className="text-2xl font-semibold mb-2">{product.title}</h1>

          <div className="flex items-center gap-2 mb-6">
            {product.weightGr && <span className="text-sm text-muted-foreground">{product.weightGr} г</span>}
            {product.category && (
              <Link
                href={`/category/${product.category.slug}`}
                className="text-sm text-primary hover:underline"
              >
                {product.category.name}
              </Link>
            )}
          </div>

          <div className="flex items-end gap-3 mb-6">
            {hasDiscount && product.oldPrice ? (
              <>
                <span className="text-3xl font-semibold">{product.price}₽</span>
                <span className="text-xl text-muted-foreground line-through">{product.oldPrice}₽</span>
              </>
            ) : (
              <span className="text-3xl font-semibold">{product.price}₽</span>
            )}
          </div>

          <ProductActions product={product} />

          <div className="border-t pt-6">
            <h3 className="font-medium mb-2">Описание</h3>
            <p className="text-muted-foreground">
              {product.description || "Описание скоро появится."}
            </p>
          </div>
        </div>
      </div>

      {/* Related products */}
      <div className="mt-16">
        <h2 className="text-xl font-semibold mb-6">Похожие товары</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {relatedProducts.map((relatedProduct) => {
            const relatedImg = resolveMediaUrl(relatedProduct.imageUrl);
            const relatedDiscount =
              (relatedProduct.oldPrice ?? 0) > relatedProduct.price &&
              relatedProduct.oldPrice
                ? Math.round(
                    ((relatedProduct.oldPrice - relatedProduct.price) / relatedProduct.oldPrice) * 100,
                  )
                : null;

            return (
              <Link
                key={relatedProduct.id}
                href={`/product/${relatedProduct.id}`}
                className="block p-4 border rounded-lg transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-square mb-3">
                  {relatedImg ? (
                    <Image
                      src={relatedImg}
                      alt={relatedProduct.title}
                      fill
                      style={{ objectFit: "contain" }}
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-gray-300 text-xs">
                      Нет фото
                    </div>
                  )}
                  {relatedDiscount && (
                    <Badge className="absolute top-2 left-2 bg-primary text-white font-medium px-2">
                      -{relatedDiscount}%
                    </Badge>
                  )}
                </div>
                <h3 className="text-sm line-clamp-2 mb-2">{relatedProduct.title}</h3>
                <div className="flex justify-between items-end">
                  <span className="font-semibold">{relatedProduct.price}₽</span>
                  {relatedProduct.oldPrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      {relatedProduct.oldPrice}₽
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
