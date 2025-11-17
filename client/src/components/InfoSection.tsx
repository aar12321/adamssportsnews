import { InfoCard } from "./InfoCard";
import type { InfoItem } from "@shared/schema";

interface InfoSectionProps {
  items: InfoItem[];
}

export function InfoSection({ items }: InfoSectionProps) {
  if (items.length === 0) {
    return (
      <section className="space-y-4" data-testid="info-section">
        <h2 className="text-lg font-semibold">News, Injuries & Rumors</h2>
        <div className="text-center py-12 text-muted-foreground" data-testid="info-empty-state">
          No items match your filters
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4" data-testid="info-section">
      <h2 className="text-lg font-semibold">
        News, Injuries & Rumors <span className="text-muted-foreground font-normal">({items.length})</span>
      </h2>
      <div className="space-y-3">
        {items.map((item) => (
          <InfoCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
