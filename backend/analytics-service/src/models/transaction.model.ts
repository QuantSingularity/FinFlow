class TransactionModel {
  async findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    return [];
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    return [];
  }

  async findByUserId(userId: string): Promise<any[]> {
    return [];
  }
}

export default new TransactionModel();
