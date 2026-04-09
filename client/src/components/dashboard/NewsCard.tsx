import React, { useState } from "react";
import { ExternalLink, ChevronDown, ChevronUp, Clock, Zap, AlertTriangle, ArrowLeftRight, MessageCircle, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import ArticleModal from "./ArticleModal";

export type NewsCategory = "breaking" | "injury" | "trade" | "rumor" | "news";

const CATEGORY_CONFIG: Record<NewsCategory, { label: string; className: string; Icon: any }> = {
  breaking: { label: "Breaking", className: "badge-breaking", Icon: Zap },
  injury: { label: "Injury", className: "badge-injury", Icon: AlertTriangle },
  trade: { label: "Trade", className: "badge-trade", Icon: ArrowLeftRight },
  rumor: { label: "Rumor", className: "badge-rumor", Icon: MessageCircle },
  news: { label: "News", className: "badge-news", Icon: Newspaper },
};

interface NewsCardProps {
  id: string;
  title: string;
  description: string;
  content?: string;
  category: NewsCategory;
  sport: string;
  source: string;
  url?: string;
  imageUrl?: string;
  publishedAt: string;
  tags?: string[];
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const SPORT_COLORS: Record<string, string> = {
  basketball: "text-orange-400",
  football: "text-green-400",
  soccer: "text-blue-400",
  baseball: "text-yellow-400",
  hockey: "text-cyan-400",
};

export default function NewsCard({
  id, title, description, content, category, sport, source, url, imageUrl, publishedAt, tags
}: NewsCardProps) {
  const [showModal, setShowModal] = useState(false);
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.news;
  const { Icon } = config;

  return (
    <>
      <div
        className={cn(
          "glass-card p-4 cursor-pointer transition-all duration-200 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-lg animate-fade-in group",
          category === "breaking" && "border-red-500/20"
        )}
        onClick={() => setShowModal(true)}
      >
        {/* Category badge + time */}
        <div className="flex items-center justify-between mb-3">
          <span className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border",
            config.className
          )}>
            <Icon className="w-3 h-3" />
            {config.label}
          </span>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className={cn("text-xs font-medium", SPORT_COLORS[sport] || "text-muted-foreground")}>
              {sport.charAt(0).toUpperCase() + sport.slice(1)}
            </span>
            <span className="text-xs text-muted-foreground/60">•</span>
            <Clock className="w-3 h-3" />
            <span className="text-xs">{timeAgo(publishedAt)}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors leading-snug">
          {title}
        </h3>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground/70 font-medium">{source}</span>
          <span className="text-xs text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            Read more <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
          </span>
        </div>
      </div>

      {showModal && (
        <ArticleModal
          title={title}
          description={description}
          content={content}
          category={category}
          sport={sport}
          source={source}
          url={url}
          imageUrl={imageUrl}
          publishedAt={publishedAt}
          tags={tags}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
