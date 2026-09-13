/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas", "pdfkit", "fontkit"],
  outputFileTracingIncludes: {
      "/api/cases/*/export": ["./public/fonts/*.ttf"],
      "/api/**/*": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs", "./node_modules/pdfjs-dist/cmaps/**/*", "./node_modules/pdfjs-dist/standard_fonts/**/*", "./node_modules/pdfjs-dist/wasm/**/*"],
  },
};

export default nextConfig;
