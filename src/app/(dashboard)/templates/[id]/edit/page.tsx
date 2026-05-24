"use client";

import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TemplateBuilder } from "@/components/templates/TemplateBuilder";

export default function EditTemplatePage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/templates"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Templates
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-lg font-semibold">Edit Template</h1>
      </div>
      <TemplateBuilder templateId={id} />
    </div>
  );
}
