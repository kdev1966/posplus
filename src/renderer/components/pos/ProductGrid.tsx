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
          className="cursor-pointer"
        >
          <div className="mb-3">
            <h3 className="font-semibold text-white truncate mb-1">{product.name}</h3>
            <p className="text-sm text-gray-400 mb-2">{product.sku}</p>

            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-primary-300">
                {formatCurrency(product.price)}
              </span>

              {product.stock <= product.minStock && (
                <Badge variant="warning" className="text-xs">
                  {t('lowStock')}
                </Badge>
              )}
            </div>

            {product.discountRate > 0 && (
              <div className="mt-2">
                <Badge variant="success" className="text-xs">
                  {t('remise')}: {(product.discountRate * 100).toFixed(0)}%
                </Badge>
              </div>
            )}

            <div className="mt-2 text-xs text-gray-500">
              {t('stock')}: {product.stock} {product.unit}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
