// components/AttributeInputList.tsx

import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Attribute = { key: string; value: string };
type Props = {
  attributes: Attribute[];
  onChange: (attrs: Attribute[]) => void;
};

export default function AttributeInputList({ attributes, onChange }: Props) {
  // Add new empty attribute
  const handleAdd = () => onChange([...attributes, { key: "", value: "" }]);
  // Remove attribute at index
  const handleRemove = (idx: number) =>
    onChange(attributes.filter((_, i) => i !== idx));
  // Update key or value
  const handleChange = (idx: number, field: "key" | "value", val: string) => {
    const copy = [...attributes];
    copy[idx][field] = val;
    onChange(copy);
  };

  return (
    <div className="space-y-2">
      {attributes.map((attr, idx) => (
        <div key={idx} className="flex space-x-2 items-center">
          <Input
            placeholder="Key"
            value={attr.key}
            onChange={e => handleChange(idx, "key", e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Value"
            value={attr.value}
            onChange={e => handleChange(idx, "value", e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => handleRemove(idx)}
            tabIndex={-1}
            className="px-2 py-1"
          >–</Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleAdd}
        className="mt-1"
      >+ Add Attribute</Button>
    </div>
  );
}
