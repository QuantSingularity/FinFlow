import { PrismaClient } from "@prisma/client";
import { User, UserCreateInput, UserUpdateInput } from "../types/user.types";

class UserModel {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async update(id: string, data: UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async findAll(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async updateRefreshToken(
    id: string,
    refreshToken: string | null,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { refreshToken },
    });
  }
}

export default new UserModel();
