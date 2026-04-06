class CategoryService {
  async categorizeTransaction(description: string): Promise<string | null> {
    if (!description) return null;
    const desc = description.toLowerCase();
    if (desc.includes("salary") || desc.includes("payroll")) return "PAYROLL";
    if (desc.includes("rent") || desc.includes("lease")) return "RENT";
    if (
      desc.includes("utilities") ||
      desc.includes("electricity") ||
      desc.includes("water")
    )
      return "UTILITIES";
    if (
      desc.includes("travel") ||
      desc.includes("flight") ||
      desc.includes("hotel")
    )
      return "TRAVEL";
    if (
      desc.includes("software") ||
      desc.includes("subscription") ||
      desc.includes("saas")
    )
      return "SOFTWARE";
    if (desc.includes("marketing") || desc.includes("advertising"))
      return "MARKETING";
    if (desc.includes("office") || desc.includes("supplies"))
      return "OFFICE_SUPPLIES";
    if (
      desc.includes("revenue") ||
      desc.includes("income") ||
      desc.includes("sale")
    )
      return "REVENUE";
    return "GENERAL";
  }

  async getCategories(): Promise<string[]> {
    return [
      "PAYROLL",
      "RENT",
      "UTILITIES",
      "TRAVEL",
      "SOFTWARE",
      "MARKETING",
      "OFFICE_SUPPLIES",
      "REVENUE",
      "GENERAL",
    ];
  }
}

export default new CategoryService();
