import { Prisma } from '@prisma/client';

export function defaultUserInput(
  email: string,
  fullName: string,
  companyId: string,
): Prisma.usersCreateInput {
  return {
    email,
    full_name: fullName,
    roles: ['user'],
    avatar: `https://ui-avatars.com/api/?name=${fullName.replace(' ', '+')}`,
    company: { connect: { id: companyId } },
  };
}
