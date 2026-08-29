import { AlertCircle, Inbox, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ResultState({
  kind,
  title,
  message,
  onRetry,
}: {
  kind: "empty" | "error" | "invalid";
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  const Icon = kind === "empty" ? Inbox : AlertCircle;
  return (
    <Card>
      <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
        <span className="mb-4 rounded-full bg-muted p-3">
          <Icon className="size-6 text-muted-foreground" aria-hidden />
        </span>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
        {onRetry ? (
          <Button variant="outline" className="mt-5" onClick={onRetry}>
            <RotateCcw className="size-4" aria-hidden />
            Try again
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
