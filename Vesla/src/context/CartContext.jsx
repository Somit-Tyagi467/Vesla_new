import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCartLinePrice } from "../data/storeCatalog";

const CartContext = createContext(null);
const STORAGE_KEY = "vesla-store-cart-v1";

function readSavedCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((line) => line?.key && line?.productId) : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readSavedCart);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((productId, addOnIds = []) => {
    const sortedAddOns = [...new Set(addOnIds)].sort();
    const key = `${productId}:${sortedAddOns.join(",")}`;
    setItems((current) => {
      const existing = current.find((line) => line.key === key);
      if (existing) return current.map((line) => line.key === key ? { ...line, quantity: line.quantity + 1 } : line);
      return [...current, { key, productId, addOnIds: sortedAddOns, quantity: 1 }];
    });
  }, []);

  const setQuantity = useCallback((key, quantity) => {
    setItems((current) => quantity <= 0
      ? current.filter((line) => line.key !== key)
      : current.map((line) => line.key === key ? { ...line, quantity: Math.min(99, quantity) } : line));
  }, []);

  const removeItem = useCallback((key) => {
    setItems((current) => current.filter((line) => line.key !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const value = useMemo(() => ({
    items,
    itemCount: items.reduce((count, line) => count + line.quantity, 0),
    subtotal: items.reduce((total, line) => total + getCartLinePrice(line) * line.quantity, 0),
    addItem,
    setQuantity,
    removeItem,
    clearCart,
  }), [items, addItem, setQuantity, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider.");
  return context;
}
