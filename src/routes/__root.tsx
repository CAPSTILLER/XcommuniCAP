import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "XcommuniCAP";

const APP_ORIGIN = (import.meta.env.VITE_APP_ORIGIN as string | undefined)?.replace(/\/$/, "") || "https://xcommunicap.gearup.wtf";
const APP_DESCRIPTION =
  "Emoji matrix text-art generator for X and Farcaster. Stamp 5×5 letters onto a 19×7 or 19×52 grid, draw freehand, copy, and post.";
const OG_IMAGE = `${APP_ORIGIN}/og.jpg`;
const FC_MINIAPP = "{\"version\":\"1\",\"imageUrl\":\"https://xcommunicap.gearup.wtf/og.jpg\",\"button\":{\"title\":\"Open\",\"action\":{\"type\":\"launch_miniapp\",\"name\":\"XcommuniCAP\",\"url\":\"https://xcommunicap.gearup.wtf/\",\"splashImageUrl\":\"https://xcommunicap.gearup.wtf/splash-200.png\",\"splashBackgroundColor\":\"#0A0A0A\"}}}";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "description", content: APP_DESCRIPTION },
      { name: "theme-color", content: "#0A0A0A" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: APP_NAME },
      { property: "og:title", content: APP_NAME },
      { property: "og:description", content: APP_DESCRIPTION },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:url", content: `${APP_ORIGIN}/` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: APP_NAME },
      { name: "twitter:description", content: APP_DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "fc:miniapp", content: FC_MINIAPP },
      { name: "fc:frame", content: FC_MINIAPP },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon-32.png", sizes: "32x32" },
      { rel: "icon", type: "image/png", href: "/icon-192.png", sizes: "192x192" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  component: () => (
    <html lang="en" className="dark antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg">
        <PreviewHostBridge />
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});
