import "../globals.css";
export const metadata = { title: "JR Tools — Admin", robots: "noindex" };
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-forge-900 font-body text-steel-100 antialiased">{children}</body>
    </html>
  );
}
