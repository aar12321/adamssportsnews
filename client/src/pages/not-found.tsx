import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            The page you were looking for doesn't exist or may have moved.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Home className="w-4 h-4" /> Back to home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
