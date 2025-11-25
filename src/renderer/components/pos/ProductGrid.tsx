import React from 'react'
import { Product } from '@shared/types'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { useLanguageStore } from '../../store/languageStore'
import { formatCurrency } from '../../utils/currency'

interface ProductGridProps {
  products: Product[]
  onProductClick: (product: Product) => void
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products, onProductClick }) => {
  const { t } = useLanguageStore()

  return (
    <div className="product-grid">
      {products.map((product) => (
        <Card
          key={product.id}
          hover
          onClick={() => onProductClick(product)}
          className="cursor-pointer h-full flex flex-col"
        >
          <div className="flex-1 flex flex-col">
            {/* Product Name - Multi-line with ellipsis after 2 lines */}
            <h3 className="font-semibold text-white mb-2 text-lg leading-tight line-clamp-2 min-h-[3.5rem]">
              {product.name}
            </h3>

            {/* SKU */}
            <p className="text-xs text-gray-500 mb-3 font-mono">{product.sku}</p>

            {/* Price - Larger and more prominent */}
            <div className="mb-3">
              <span className="text-2xl font-bold text-primary-300 block">
                {formatCurrency(product.price)}
              </span>
            </div>

            {/* Badges Row */}
            <div className="flex flex-wrap gap-2 mb-3">
              {product.stock <= product.minStock && (
                <Badge variant="warning" className="text-xs">
                  ⚠️ {t('lowStock')}
                </Badge>
              )}

              {product.discountRate > 0 && (
                <Badge variant="success" className="text-xs">
                  🎯 {t('remise')}: {(product.discountRate * 100).toFixed(0)}%
                </Badge>
              )}
            </div>

            {/* Stock Info - Bottom of card */}
            <div className="mt-auto pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{t('stock')}:</span>
                <span className={`font-semibold ${product.stock <= product.minStock ? 'text-yellow-400' : 'text-green-400'}`}>
                  {product.stock} {product.unit}
                </span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
