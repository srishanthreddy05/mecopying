"use client";

import { useState, useEffect } from "react";
import { Star, MessageSquarePlus, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { formatDisplayDate } from "@/lib/validations";

interface Review {
  id: string;
  name: string;
  rating: number;
  review: string;
  createdAt: string;
}

export default function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState<string>("");
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Load reviews on mount
  useEffect(() => {
    async function fetchInitial() {
      try {
        const res = await fetch("/api/reviews?limit=6&offset=0");
        if (res.ok) {
          const data = await res.json();
          setReviews(data.reviews || []);
          setTotalCount(data.totalCount || 0);
          setAverageRating(data.averageRating || 0);
          setHasMore(!!data.hasMore);
        }
      } catch (err) {
        console.error("Failed to load reviews:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchInitial();
  }, []);

  // Load more reviews
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(`/api/reviews?limit=6&offset=${reviews.length}`);
      if (res.ok) {
        const data = await res.json();
        setReviews((prev) => [...prev, ...(data.reviews || [])]);
        setHasMore(!!data.hasMore);
      }
    } catch (err) {
      console.error("Failed to load more reviews:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Submit new review
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const trimmedName = name.trim();
    const trimmedReview = reviewText.trim();

    if (!trimmedName) {
      setFormError("Please enter your name.");
      return;
    }
    if (trimmedName.length > 50) {
      setFormError("Name must not exceed 50 characters.");
      return;
    }
    if (rating < 1 || rating > 5) {
      setFormError("Please select a star rating between 1 and 5.");
      return;
    }
    if (!trimmedReview) {
      setFormError("Please write a few words about your experience.");
      return;
    }
    if (trimmedReview.length > 500) {
      setFormError("Review must not exceed 500 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          rating,
          review: trimmedReview,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit review");
      }

      setFormSuccess("Thank you! Your review has been posted.");
      // Prepend to list & recalculate stats
      if (data.review) {
        setReviews((prev) => [data.review, ...prev]);
        setTotalCount((prev) => {
          const nextCount = prev + 1;
          setAverageRating((oldAvg) => {
            const sum = oldAvg * prev + rating;
            return Number((sum / nextCount).toFixed(1));
          });
          return nextCount;
        });
      }

      // Reset form
      setName("");
      setRating(5);
      setReviewText("");

      setTimeout(() => {
        setFormSuccess(null);
      }, 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to post review. Please try again.";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <section id="reviews" className="w-full py-16 px-4 sm:px-6 max-w-6xl mx-auto scroll-mt-20">
      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#65a30d] dark:text-[#ccff00]">
          Feedback & Thoughts
        </span>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-neutral-900 dark:text-white mt-1">
          What do you think of Mecopying?
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2 leading-relaxed">
          Built as a fun side project. Tried it out? Leave a rating and let me know what you think!
        </p>

        {/* Global Summary Badge */}
        {totalCount > 0 && (
          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200 shadow-xs">
            <div className="flex items-center text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    star <= Math.round(averageRating)
                      ? "fill-amber-400 text-amber-500"
                      : "text-neutral-300 dark:text-neutral-700"
                  }`}
                />
              ))}
            </div>
            <span className="font-bold text-neutral-900 dark:text-white">{averageRating.toFixed(1)} / 5</span>
            <span className="text-neutral-400">•</span>
            <span className="text-neutral-500 font-mono">
              {totalCount} {totalCount === 1 ? "review" : "reviews"}
            </span>
          </div>
        )}
      </div>

      {/* Main Grid: 2 Columns on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Review Submission Form (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-xs">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-xl bg-[#ccff00]/20 text-neutral-900 dark:text-[#ccff00] flex items-center justify-center">
              <MessageSquarePlus className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Write a Review
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Success Alert */}
            {formSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{formSuccess}</span>
              </div>
            )}

            {/* Error Alert */}
            {formError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            {/* Name Input */}
            <div className="space-y-1.5">
              <label htmlFor="review-name" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                Your Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="review-name"
                type="text"
                required
                maxLength={50}
                placeholder="e.g. Alex Rivera or @student_dev"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-[#ccff00] transition disabled:opacity-50"
              />
            </div>

            {/* Star Rating Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                  Rating <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  {rating} out of 5 stars
                </span>
              </div>

              <div
                className="flex items-center gap-1.5 pt-1"
                role="radiogroup"
                aria-label="Star rating selector"
                onMouseLeave={() => setHoverRating(0)}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={rating === star}
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onFocus={() => setHoverRating(star)}
                    onBlur={() => setHoverRating(0)}
                    disabled={isSubmitting}
                    className="p-1 rounded-lg hover:scale-110 active:scale-95 transition-transform focus:outline-none focus:ring-2 focus:ring-[#ccff00]"
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${
                        star <= activeRating
                          ? "fill-amber-400 text-amber-500"
                          : "text-neutral-300 dark:text-neutral-700"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Review Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="review-text" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                  Review <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs font-mono text-neutral-400">
                  {reviewText.length} / 500
                </span>
              </div>
              <textarea
                id="review-text"
                required
                rows={4}
                maxLength={500}
                placeholder="What did you like? How did you use it? Any suggestions?"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white text-sm outline-none resize-none focus:ring-2 focus:ring-[#ccff00] transition disabled:opacity-50"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !reviewText.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#ccff00] hover:bg-[#bbf000] text-neutral-950 font-bold text-sm transition shadow-sm active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Posting Review...</span>
                </>
              ) : (
                <span>Post Review</span>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Published Reviews List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">
              Community Reviews {totalCount > 0 && <span className="text-xs font-mono font-normal text-neutral-500">({totalCount})</span>}
            </h3>
            <span className="text-xs font-mono text-neutral-400">
              Newest first
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-neutral-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#65a30d] dark:text-[#ccff00]" />
              <span className="text-xs font-mono">Loading reviews...</span>
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-8 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center space-y-2 bg-white/40 dark:bg-neutral-900/40">
              <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 mx-auto flex items-center justify-center text-neutral-400">
                <Star className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                Be the first to review Mecopying!
              </h4>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                No reviews yet. Share your feedback using the form and help shape this project.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs space-y-2.5 transition hover:border-neutral-300 dark:hover:border-neutral-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-800 dark:text-neutral-200 font-mono uppercase">
                        {rev.name.slice(0, 1)}
                      </div>
                      <span className="text-sm font-bold text-neutral-900 dark:text-white">
                        {rev.name}
                      </span>
                    </div>

                    <span className="text-xs text-neutral-400 font-mono" suppressHydrationWarning>
                      {formatDisplayDate(rev.createdAt)}
                    </span>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= rev.rating
                            ? "fill-amber-400 text-amber-500"
                            : "text-neutral-200 dark:text-neutral-800"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Review Text */}
                  <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                    {rev.review}
                  </p>
                </div>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div className="pt-2 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="px-5 py-2 rounded-2xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white text-xs font-semibold transition active:scale-95 disabled:opacity-50"
                  >
                    {isLoadingMore ? "Loading more..." : "Load more reviews"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
