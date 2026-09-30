import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { ErrorState, LoadingRows } from "../components/common/DataState";
import { StatusBadge } from "../components/common/StatusBadge";
import { Money } from "../components/common/Money";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { getPayment } from "../services/paymentService";
import { formatDateTime } from "../lib/format";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}

export default function PaymentDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["payment", id],
    queryFn: () => getPayment(id),
    enabled: !!id,
  });

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-2 -ml-2 text-muted-foreground"
        onClick={() => navigate("/payments")}
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Payments
      </Button>
      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading || !data ? (
        <LoadingRows rows={3} />
      ) : (
        <>
          <div className="mb-6 flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Payment
            </h1>
            <span className="tabular text-sm text-muted-foreground">
              {data.id}
            </span>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Row label="Amount">
                  <Money amount={data.amount} currency={data.currency} />
                </Row>
                <Row label="Status">
                  <StatusBadge status={data.status} />
                </Row>
                <Row label="Currency">{data.currency}</Row>
                <Row label="Processor">{data.processorId ?? "-"}</Row>
                <Row label="Created">{formatDateTime(data.createdAt)}</Row>
                <Row label="Updated">{formatDateTime(data.updatedAt)}</Row>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="tabular text-3xl font-semibold">
                  <Money amount={data.amount} currency={data.currency} />
                </div>
                <div className="mt-2">
                  <StatusBadge status={data.status} />
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
