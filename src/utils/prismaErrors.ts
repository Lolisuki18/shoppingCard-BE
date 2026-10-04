import { Prisma } from '@prisma/client'

//P2002: vi phạm unique | P2003: vi phạm foreign key | P2025: không tìm thấy bản ghi
export const isPrismaError = (error: unknown, code: 'P2002' | 'P2003' | 'P2025') =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
