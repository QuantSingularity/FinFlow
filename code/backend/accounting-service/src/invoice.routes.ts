import express from "express";
import invoiceController from "./invoice.controller";

const router = express.Router();

router.post("/", invoiceController.createInvoice.bind(invoiceController));
router.get("/:id", invoiceController.getInvoiceById.bind(invoiceController));
router.get("/", invoiceController.getInvoicesByUserId.bind(invoiceController));
router.put("/:id", invoiceController.updateInvoice.bind(invoiceController));
router.delete("/:id", invoiceController.deleteInvoice.bind(invoiceController));

export default router;
