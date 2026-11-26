import { z } from 'zod'
import { passwordRule } from '@/features/auth/schemas'

const optionalText = z.string().trim().max(40, 'Use no máximo 40 caracteres.')

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Use pelo menos 2 caracteres.')
    .max(60, 'Use no máximo 60 caracteres.'),
  username: z
    .string()
    .trim()
    .regex(/^[a-z0-9_.]{3,24}$/i, 'Use 3 a 24 letras, números, ponto ou _.'),
  email: z.email('Digite um e-mail válido.'),
  ensName: optionalText,
  walletNickname: optionalText,
})
export type ProfileValues = z.infer<typeof profileSchema>

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Digite a senha atual.'),
    newPassword: passwordRule,
    confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'A nova senha precisa ser diferente da atual.',
  })
export type PasswordChangeValues = z.infer<typeof passwordChangeSchema>

export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp']
export const AVATAR_MAX_BYTES = 1024 * 1024

// Validação do arquivo antes de enviar: a API confere de novo.
export function validateAvatar(file: { type: string; size: number }) {
  if (!AVATAR_TYPES.includes(file.type))
    return 'Use uma imagem PNG, JPG ou WebP.'
  if (file.size === 0) return 'O arquivo está vazio.'
  if (file.size > AVATAR_MAX_BYTES) return 'A imagem deve ter no máximo 1 MB.'
  return null
}

export function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
