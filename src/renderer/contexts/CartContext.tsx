import React, { createContext, useState, useContext } from 'react';
import { Product } from '@shared/types/models';

export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

interface CartContextType {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  tax: number;
  total: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const calculateTotals = (cartItems: CartItem[]) => {
    let subtotal = 0;
    let tax = 0;
    let totalItems = 0;

    cartItems.forEach(item => {
      const itemSubtotal = item.product.price_ht * item.quantity;
      const itemTax = itemSubtotal * item.product.tax_rate;
      subtotal += itemSubtotal;
      tax += itemTax;
      totalItems += item.quantity;
    });

    return {
      subtotal,
      tax,
      total: subtotal + tax,
      totalItems,
    };
  };

  const addItem = (product: Product, quantity = 1) => {
    setItems(currentItems => {
      const existingIndex = currentItems.findIndex(item => item.product.id === product.id);

      if (existingIndex >= 0) {
        const newItems = [...currentItems];
        newItems[existingIndex].quantity += quantity;
        newItems[existingIndex].subtotal =
          newItems[existingIndex].product.price_ttc * newItems[existingIndex].quantity;
        return newItems;
      } else {
        return [
          ...currentItems,
          {
            product,
            quantity,
            subtotal: product.price_ttc * quantity,
          },
        ];
      }
    });
  };

  const removeItem = (productId: string) => {
    setItems(currentItems => currentItems.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setItems(currentItems =>
      currentItems.map(item =>
        item.product.id === productId
          ? {
              ...item,
              quantity,
              subtotal: item.product.price_ttc * quantity,
            }
          : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totals = calculateTotals(items);

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems: totals.totalItems,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
