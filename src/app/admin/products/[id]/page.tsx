"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { ProductEditor } from "@/components/admin/ProductEditor";

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const [meta, setMeta] = useState<any>(null);
  useEffect(() => {
    fetch("/api/admin/products").then(async (r) => {
      if (r.status === 401) { window.location.href = "/admin"; return; }
      setMeta(await r.json());
    });
  }, []);
  if (!meta) return null;
  const product = meta.products.find((p: any) => p.id === id);
  if (!product) return <p className="p-8 text-steel-400">Not found</p>;
  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 font-display text-2xl font-bold uppercase">Edit / Editar — {product.sku}</h1>
        <ProductEditor initial={product} brands={meta.brands} categories={meta.categories} productId={product.id} />
      </main>
    </>
  );
}
