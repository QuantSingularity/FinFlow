import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, CreditCard } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
} from "../components/common/DataState";
import { StatusBadge } from "../components/common/StatusBadge";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { getPayments, createPayment } from "../services/paymentService";
import { formatCurrency, formatDate } from "../lib/format";
import { getErrorMessage } from "../lib/errors";
import { toast } from "sonner";
import type { Payment } from "../types";

function CreatePaymentDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [reference, setReference] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      createPayment({
        amount: parseFloat(amount),
        currency,
        metadata: { reference },
      } as unknown as Parameters<typeof createPayment>[0]),
    onSuccess: () => {
      toast.success("Payment created");
      qc.invalidateQueries({ queryKey: ["payments"] });
      setOpen(false);
      setAmount("");
      setReference("");
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Could not create the payment.")),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a payment</DialogTitle>
          <DialogDescription>
            Charge a customer or record an incoming payment.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["USD", "EUR", "GBP", "PKR"].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ref">Reference</Label>
            <Input
              id="ref"
              placeholder="Invoice #, customer name…"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            disabled={!amount || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Payments() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["payments"],
    queryFn: getPayments,
  });
  const payments: Payment[] = Array.isArray(data) ? data : [];

  return (
    <div>
      <PageHeader
        title="Payments"
        description="Track money in and out across every processor."
        actions={<CreatePaymentDialog />}
      />
      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <LoadingRows />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payments yet"
          message="Create your first payment to start tracking money movement."
          action={<CreatePaymentDialog />}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Processor
                </TableHead>
                <TableHead className="hidden md:table-cell">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/payments/${p.id}`)}
                >
                  <TableCell className="tabular font-medium">
                    {formatCurrency(p.amount, p.currency)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {p.processorId ?? "-"}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatDate(p.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
