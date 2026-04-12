"use strict";

function makeMock() {
  const fn = () => ({ mockResolvedValue: () => {}, mockReturnValue: () => {} });
  const table = () => ({
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn().mockResolvedValue({ _sum: {}, _count: {} }),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    count: jest.fn().mockResolvedValue(0),
    upsert: jest.fn(),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    groupBy: jest.fn().mockResolvedValue([]),
  });

  const instance = {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest
      .fn()
      .mockImplementation((fn) =>
        typeof fn === "function" ? fn(instance) : Promise.resolve(fn),
      ),
    journalEntry: table(),
    ledgerEntry: table(),
    account: table(),
    invoice: table(),
    forecast: table(),
    payment: table(),
    user: table(),
    tenant: table(),
    transaction: table(),
    category: table(),
    integration: table(),
  };
  return instance;
}

const PrismaClient = jest.fn().mockImplementation(makeMock);

module.exports = { PrismaClient };
