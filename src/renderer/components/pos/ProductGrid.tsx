import React from 'react'
import { Product } from '@shared/types'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'

interface ProductGridProps {
  products: Product[]
  onProductClick: (product: Product) => void
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products, onProductClick }) => {
  return (
    <div className="product-grid">
      {products.map((product) => (
        <Card
          key={product.id}
          hover
          onClick={() => onProductClick(product)}
          className="cursor-pointer"
        >
          <div className="aspect-square bg-gray-800 rounded-lg mb-3 flex items-center justify-center text-4xl">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover rounded-lg" />
            ) : (
              '📦'
            )}
          </div>

          <div>
            <h3 className="font-semibold text-white truncate mb-1">{product.name}</h3>
            <p className="text-sm text-gray-400 mb-2">{product.sku}</p>

            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-primary-300">
                €{product.price.toFixed(2)}
              </span>

              {product.stock <= product.minStock && (
                <Badge variant="warning" className="text-xs">
                  Low Stock
                </Badge>
              )}
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Stock: {product.stock} {product.unit}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
