import type {UserRole} from "@prisma/client";
import {config} from "../config";

// roles stored on the user plus admin for emails listed in ADMIN_EMAILS
export function effectiveRoles(user: { email: string; roles: string[] }): UserRole[] {
    const roles = new Set(user.roles as UserRole[]);
    if (config.ADMIN_EMAILS.includes(user.email.toLowerCase())) roles.add('admin');
    return [...roles];
}
