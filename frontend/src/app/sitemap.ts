import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://faredelta.rijan.sh";
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/tracked`, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/alerts`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/signup`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
