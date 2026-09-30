import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Loader2, Plus } from "lucide-react";
import { PageHeader } from "../components/common/PageHeader";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
} from "../components/common/DataState";
import { StatusBadge } from "../components/common/StatusBadge";
import { Money } from "../components/common/Money";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
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
import {
  getCreditScore,
  getLoans,
  applyForLoan,
} from "../services/creditService";
import { formatDate } from "../lib/format";
import { getErrorMessage } from "../lib/errors";
import { toast } from "sonner";

function ScoreRing({ score }: { score: number }) {
  const pct = Math.max(0, Math.min(1, (score - 300) / 550));
  const r = 70,
    c = 2 * Math.PI * r,
    dash = c * pct;
  return (
    <div className="relative h-44 w-44">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="12"
        />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="hsl(var(--chart-1))"
          strokeWidth="12"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular text-4xl font-bold">{score || "-"}</span>
        <span className="text-xs text-muted-foreground">of 850</span>
      </div>
    </div>
  );
}

function ApplyDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [term, setTerm] = useState("12 months");
  const [purpose, setPurpose] = useState("");
  const m = useMutation({
    mutationFn: () =>
      applyForLoan({ amount: parseFloat(amount), term, purpose }),
    onSuccess: () => {
      toast.success("Application submitted");
      qc.invalidateQueries({ queryKey: ["loans"] });
      setOpen(false);
      setAmount("");
      setPurpose("");
    },
    onError: (e) =>
      toast.error(getErrorMessage(e, "Could not submit the application.")),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Apply for financing
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply for financing</DialogTitle>
          <DialogDescription>
            Request working capital based on your FinFlow activity.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="la">Amount</Label>
            <Input
              id="la"
              type="number"
              min="0"
              step="100"
              placeholder="25000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Term</Label>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["6 months", "12 months", "24 months", "36 months"].map(
                  (t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lp">Purpose</Label>
            <Input
              id="lp"
              placeholder="Inventory, expansion…"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!amount || m.isPending} onClick={() => m.mutate()}>
            {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{" "}
            Submit application
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Credit() {
  const score = useQuery({
    queryKey: ["credit-score"],
    queryFn: getCreditScore,
  });
  const loans = useQuery({ queryKey: ["loans"], queryFn: getLoans });
  const loanList = Array.isArray(loans.data) ? loans.data : [];

  return (
    <div>
      <PageHeader
        title="Credit"
        description="Track your credit health and access financing."
        actions={<ApplyDialog />}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Credit score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {score.isError ? (
              <EmptyState
                icon={Landmark}
                title="Score unavailable"
                message="We couldn’t retrieve your score right now."
              />
            ) : score.isLoading ? (
              <LoadingRows rows={2} />
            ) : (
              <>
                <ScoreRing score={score.data?.score ?? 0} />
                <p className="mt-3 font-display text-lg font-semibold">
                  {score.data?.category ?? "-"}
                </p>
                {score.data?.factors?.length ? (
                  <ul className="mt-4 w-full space-y-2">
                    {score.data.factors.map((f) => (
                      <li
                        key={f.label}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">{f.label}</span>
                        <span
                          className={
                            f.impact === "positive"
                              ? "text-success"
                              : f.impact === "negative"
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }
                        >
                          {f.impact}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Financing</CardTitle>
          </CardHeader>
          <CardContent>
            {loans.isError ? (
              <ErrorState onRetry={loans.refetch} />
            ) : loans.isLoading ? (
              <LoadingRows rows={3} />
            ) : loanList.length === 0 ? (
              <EmptyState
                icon={Landmark}
                title="No financing yet"
                message="Apply for working capital and your facilities will appear here."
                action={<ApplyDialog />}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Term</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Opened
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loanList.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>
                        <Money
                          amount={l.amount}
                          currency={l.currency ?? "USD"}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={l.status} />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">
                        {l.term ?? "-"}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">
                        {l.createdAt ? formatDate(l.createdAt) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
