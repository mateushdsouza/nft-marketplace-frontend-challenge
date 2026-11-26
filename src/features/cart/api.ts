import { api } from '@/shared/api/client'
import type {
  Cart,
  CartItemInput,
  Quote,
  QuoteRequest,
} from '@/shared/api/types'

export async function fetchCart(signal?: AbortSignal) {
  const { data } = await api.get<Cart>('/cart', { signal })
  return data
}

export async function addCartItem(input: CartItemInput) {
  const { data } = await api.post<Cart>('/cart/items', input)
  return data
}

export async function updateCartItem(itemId: string, quantity: number) {
  const { data } = await api.patch<Cart>(`/cart/items/${itemId}`, {
    quantity,
  })
  return data
}

export async function removeCartItem(itemId: string) {
  const { data } = await api.delete<Cart>(`/cart/items/${itemId}`)
  return data
}

export async function applyCoupon(code: string) {
  const { data } = await api.put<Cart>('/cart/coupon', { code })
  return data
}

export async function removeCoupon() {
  const { data } = await api.delete<Cart>('/cart/coupon')
  return data
}

export async function mergeGuestCart(guestCartId: string) {
  const { data } = await api.post<{ cart: Cart; adjusted: boolean }>(
    '/cart/merge',
    { guestCartId },
  )
  return data
}

export async function fetchQuote(body: QuoteRequest, signal?: AbortSignal) {
  const { data } = await api.post<Quote>('/quote', body, { signal })
  return data
}
