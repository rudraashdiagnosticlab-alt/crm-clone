import { api } from './api';

export type UserRole = 'admin' | 'team_leader' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mfaEnabled?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  /** Optional — only sent when changing the password. */
  password?: string;
}

export const usersApi = {
  list: async (): Promise<User[]> => (await api.get('/users')).data,
  create: async (input: CreateUserInput): Promise<User> => (await api.post('/users', input)).data,
  update: async (id: string, input: UpdateUserInput): Promise<User> => (await api.patch(`/users/${id}`, input)).data,
  deactivate: async (id: string): Promise<User> => (await api.delete(`/users/${id}`)).data,
};
