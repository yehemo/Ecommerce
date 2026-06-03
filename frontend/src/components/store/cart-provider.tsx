'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import axios from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';

export type CartItem = {
  id: string;
  product_variant_id: string;
  quantity: number;
  unit_price_minor: number;
  product_variant: {
    id: string;
    sku: string;
    price_minor: number;
    stock_qty: number;
    product: {
      id: string;
      name: string;
      images: Array<{ id: string; image_url: string; sort_order: number }>;
    };
    option_values: Array<{
      id: string;
      value: string;
      option_type: { id: string; name: string };
    }>;
  };
};

type CartContextType = {
  items: CartItem[];
  isLoading: boolean;
  addItem: (variant: any, product: any, quantity: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  cartCount: number;
  subtotalMinor: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth({ redirectIfAuthenticated: '' }); 
  
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from local storage initially for guests
  useEffect(() => {
    if (typeof window !== 'undefined' && !user && !authLoading) {
      const stored = localStorage.getItem('lyh_cart');
      if (stored) {
        try {
          setItems(JSON.parse(stored));
        } catch (e) {}
      }
      setIsLoading(false);
    }
  }, [user, authLoading]);

  // Sync with backend if user is logged in
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      const syncCart = async () => {
        setIsLoading(true);
        try {
          // 1. Fetch remote cart
          const { data } = await axios.get('/api/cart');
          let remoteItems = data.data.items || [];

          // 2. Merge local items if they exist
          const localItemsStr = localStorage.getItem('lyh_cart');
          if (localItemsStr) {
            const localItems: CartItem[] = JSON.parse(localItemsStr);
            if (localItems.length > 0) {
              for (const local of localItems) {
                const existing = remoteItems.find((ri: any) => ri.product_variant_id === local.product_variant_id);
                if (existing) {
                  const newQty = existing.quantity + local.quantity;
                  const res = await axios.patch(`/api/cart/items/${existing.id}`, { quantity: newQty });
                  remoteItems = remoteItems.map((ri: any) => ri.id === existing.id ? res.data.data : ri);
                } else {
                  const res = await axios.post('/api/cart/items', { 
                    product_variant_id: local.product_variant_id, 
                    quantity: local.quantity 
                  });
                  remoteItems.push(res.data.data);
                }
              }
              // Clear local storage after successful sync
              localStorage.removeItem('lyh_cart');
            }
          }
          setItems(remoteItems);
        } catch (err) {
          console.error("Failed to sync cart", err);
        } finally {
          setIsLoading(false);
        }
      };
      syncCart();
    } else if (!authLoading) {
      const stored = localStorage.getItem('lyh_cart');
      setItems(stored ? JSON.parse(stored) : []);
    }
  }, [user, authLoading]);

  // Save to local storage whenever items change IF we are a guest
  useEffect(() => {
    if (!authLoading && !user) {
      localStorage.setItem('lyh_cart', JSON.stringify(items));
    }
  }, [items, user, authLoading]);

  const addItem = async (variant: any, product: any, quantity: number) => {
    if (user) {
      const existing = items.find(i => i.product_variant_id === variant.id);
      if (existing) {
        const res = await axios.patch(`/api/cart/items/${existing.id}`, { quantity: existing.quantity + quantity });
        setItems(prev => prev.map(i => i.id === existing.id ? res.data.data : i));
      } else {
        const res = await axios.post('/api/cart/items', { product_variant_id: variant.id, quantity });
        setItems(prev => [...prev, res.data.data]);
      }
    } else {
      setItems(prev => {
        const existing = prev.find(i => i.product_variant_id === variant.id);
        if (existing) {
          return prev.map(i => i.id === existing.id ? { ...i, quantity: i.quantity + quantity } : i);
        } else {
          const newItem: CartItem = {
            id: `local-${crypto.randomUUID()}`,
            product_variant_id: variant.id,
            quantity,
            unit_price_minor: variant.price_minor,
            product_variant: {
              id: variant.id,
              sku: variant.sku,
              price_minor: variant.price_minor,
              stock_qty: variant.stock_qty,
              product: {
                id: product.id,
                name: product.name,
                images: product.images || [],
              },
              option_values: variant.option_values || [],
            }
          };
          return [...prev, newItem];
        }
      });
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(itemId);
      return;
    }

    if (user && !itemId.startsWith('local-')) {
      const res = await axios.patch(`/api/cart/items/${itemId}`, { quantity });
      setItems(prev => prev.map(i => i.id === itemId ? res.data.data : i));
    } else {
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity } : i));
    }
  };

  const removeItem = async (itemId: string) => {
    if (user && !itemId.startsWith('local-')) {
      await axios.delete(`/api/cart/items/${itemId}`);
      setItems(prev => prev.filter(i => i.id !== itemId));
    } else {
      setItems(prev => prev.filter(i => i.id !== itemId));
    }
  };

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotalMinor = items.reduce((acc, item) => acc + (item.unit_price_minor * item.quantity), 0);

  return (
    <CartContext.Provider value={{ items, isLoading, addItem, updateQuantity, removeItem, cartCount, subtotalMinor }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
