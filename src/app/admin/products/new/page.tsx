"use client";
import { useEffect, useState } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { ProductEditor } from "@/components/admin/ProductEditor";

export default function NewProduct() {
  const [meta, setMeta] = useState<any>(null);
  useEffect(() => {
    fetch("/api/admin/products").then(async (r) => {
      if (r.status === 401) { window.location.href = "/admin"; return; }
      setMeta(await r.json());
    });
  }, []);
  if (!meta) return null;
  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 font-display text-2xl font-bold uppercase">New Product / Nuevo Producto</h1>
        <ProductEditor initial={null} brands={meta.brands} categories={meta.categories} />
      </main>
    </>
  );
}
