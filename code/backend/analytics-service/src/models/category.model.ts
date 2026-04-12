import { PrismaClient } from "@prisma/client";
import {
  Category,
  CategoryCreateInput,
  CategoryUpdateInput,
} from "../category.types";

class CategoryModel {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { id },
    });
  }

  async findByName(name: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: { name },
    });
  }

  async create(data: CategoryCreateInput): Promise<Category> {
    return this.prisma.category.create({
      data,
    });
  }

  async update(id: string, data: CategoryUpdateInput): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Category> {
    return this.prisma.category.delete({
      where: { id },
    });
  }

  async findAll(): Promise<Category[]> {
    return this.prisma.category.findMany({
      orderBy: { name: "asc" },
    });
  }
}

export default new CategoryModel();
