import userModel from "./models/user.model";
import { User, UserCreateInput, UserUpdateInput } from "./types/user.types";

class UserService {
  async findById(id: string): Promise<User | null> {
    return userModel.findById(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return userModel.findByEmail(email);
  }

  async create(data: UserCreateInput): Promise<User> {
    return userModel.create(data);
  }

  async update(id: string, data: UserUpdateInput): Promise<User> {
    return userModel.update(id, data);
  }

  async delete(id: string): Promise<User> {
    return userModel.delete(id);
  }

  async findAll(): Promise<User[]> {
    return userModel.findAll();
  }

  async updateRefreshToken(
    id: string,
    refreshToken: string | null,
  ): Promise<User> {
    return userModel.updateRefreshToken(id, refreshToken);
  }
}

export default new UserService();
