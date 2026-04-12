import { PrismaClient } from "@prisma/client";
import {
  UserPreference,
  UserPreferenceCreateInput,
  UserPreferenceUpdateInput,
} from "../types/user-preference.types";

class UserPreferenceModel {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findById(id: string): Promise<UserPreference | null> {
    return this.prisma.userPreference.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string): Promise<UserPreference | null> {
    return this.prisma.userPreference.findUnique({
      where: { userId },
    });
  }

  async create(data: UserPreferenceCreateInput): Promise<UserPreference> {
    return this.prisma.userPreference.create({
      data,
    });
  }

  async update(
    id: string,
    data: UserPreferenceUpdateInput,
  ): Promise<UserPreference> {
    return this.prisma.userPreference.update({
      where: { id },
      data,
    });
  }

  async upsert(
    userId: string,
    data: UserPreferenceUpdateInput,
  ): Promise<UserPreference> {
    return this.prisma.userPreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });
  }

  async delete(id: string): Promise<UserPreference> {
    return this.prisma.userPreference.delete({
      where: { id },
    });
  }
}

export default new UserPreferenceModel();
