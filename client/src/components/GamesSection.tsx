import { GameCard } from "./GameCard";
import type { Game } from "@shared/schema";

interface GamesSectionProps {
  games: Game[];
}

export function GamesSection({ games }: GamesSectionProps) {
  if (games.length === 0) {
    return (
      <section className="space-y-4" data-testid="games-section">
        <h2 className="text-lg font-semibold">Latest Games</h2>
        <div className="text-center py-12 text-muted-foreground" data-testid="games-empty-state">
          No games match your filters
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4" data-testid="games-section">
      <h2 className="text-lg font-semibold">
        Latest Games <span className="text-muted-foreground font-normal">({games.length})</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </section>
  );
}
