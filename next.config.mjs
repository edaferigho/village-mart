/** @type {import('next').NextConfig} */
const nextConfig = {
  // Product/hero images are local files served from /public, so we skip the
  // image optimization pipeline (avoids needing `sharp` on Windows dev machines).
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
