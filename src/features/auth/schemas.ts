import { z } from 'zod'

// Validação no front (≈ Bean Validation). A API valida de novo do lado dela.

export const loginSchema = z.object({
  email: z.email('Digite um e-mail válido.'),
  password: z.string().min(1, 'Digite sua senha.'),
})
export type LoginValues = z.infer<typeof loginSchema>

export const passwordRule = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
  .regex(/[a-z]/i, 'A senha precisa ter uma letra.')
  .regex(/\d/, 'A senha precisa ter um número.')

export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .regex(/^[a-z0-9_.]{3,24}$/i, 'Use 3 a 24 letras, números, ponto ou _.'),
    email: z.email('Digite um e-mail válido.'),
    password: passwordRule,
    confirmPassword: z.string().min(1, 'Confirme a senha.'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })
export type RegisterValues = z.infer<typeof registerSchema>
