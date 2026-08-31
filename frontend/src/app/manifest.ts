import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FareDelta",
    short_name: "FareDelta",
    description: "Flexible flight search and airfare intelligence.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f3ec",
    theme_color: "#102f35",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
