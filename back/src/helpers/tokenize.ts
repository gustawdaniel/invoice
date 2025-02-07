import jwt from 'jsonwebtoken';
import { config } from '../config';
import type {UserRole, users} from "@prisma/client";
import dayjs from "dayjs";
import {TokenPayload} from "../types/auth";

const issuer = `mailing.preciselab.io`;
const jwtKey = config.JWT_SECRET;

type UserProjection = Pick<users, 'id' | 'email' | 'roles' | 'companyId'>;

export interface JWTPayload {
  sub: string,
  email: string,
  iss: string,
  exp: number
  roles: string[]
  companyId: string;
}

function tokenPayload(user: UserProjection): JWTPayload {
  return {
    sub: user.id,
    email: user.email,
    iss: issuer,
    roles: user.roles,
    exp: dayjs().add(1, 'month').unix(),
    companyId: user.companyId
  };
}

export function tokenizeUser(user: UserProjection): string {
  return jwt.sign(tokenPayload(user), jwtKey);
}

export function verifyToken(token: string):  UserProjection {
  const payload = jwt.verify(token, jwtKey) as  JWTPayload;

  return {
    id: payload.sub,
    email: payload.email,
    roles: payload.roles as UserRole[],
    companyId: payload.companyId
  }
}
