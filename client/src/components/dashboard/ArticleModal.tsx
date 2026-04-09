import React, { useEffect } from "react";
import { X, ExternalLink, Clock, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NewsCategory } from "./NewsCard";

const CATEGORY_CONFIG = {
  breaking: { label: "Breaking News", className: "badge-breaking" },
  injury: { label: "Injury Report", className: "badge-injury" },
  trade: { label: "Trade News", className: "badge-trade" },
  rumor: { label: "Rumor", className: "badge-rumor" },
  news: { label: "News", className: "badge-news" },
};

interface ArticleModalProps {
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
  onClose: () => void;
}

export default function ArticleModal({
  title, description, content, category, sport, source, url,
  imageUrl, publishedAt, tags, onClose
}: ArticleModalProps) {
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.news;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div className="relative w-full sm:max-w-2xl max-h-[90vh] bg-card border border-border rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up shadow-2xl mx-0 sm:mx-4">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-bold border",
                config.className
              )}>
                {config.label}
              </span>
              <span className="text-xs text-muted-foreground font-medium capitalize">{sport}</span>
            </div>
            <h2 className="font-bold text-lg text-foreground leading-snug">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-48 object-cover rounded-xl"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}

          <p className="text-foreground/90 leading-relaxed">
            {description}
          </p>

          {content && content !== description && (
            <div className="prose prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed text-sm">
                {content.replace(/<[^>]+>/g, "").slice(0, 2000)}
                {content.length > 2000 && "..."}
              </p>
            </div>
          )}

          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-muted rounded-lg text-xs text-muted-foreground">
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span className="font-medium text-foreground">{source}</span>
              <span>•</span>
              <Clock className="w-3.5 h-3.5" />
              <span>{new Date(publishedAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
                hour: "numeric", minute: "2-digit"
              })}</span>
            </div>
            {url && url !== "#" && (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary py-2 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Full Article
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
