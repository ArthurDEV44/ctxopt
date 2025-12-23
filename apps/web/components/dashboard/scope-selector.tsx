"use client";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
} from "@/components/ui/select";
import { useProjects } from "@/lib/hooks/useProjects";

interface ScopeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function ScopeSelector({ value, onChange }: ScopeSelectorProps) {
  const { projects, isLoading } = useProjects();

  const selectedProject = projects.find((p) => p.id === value);
  const displayValue =
    value === "all"
      ? "All Projects"
      : selectedProject?.name ?? "Select project";

  const handleValueChange = (newValue: string | null) => {
    if (newValue) {
      onChange(newValue);
    }
  };

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue>{displayValue}</SelectValue>
      </SelectTrigger>
      <SelectPopup>
        <SelectItem value="all">All Projects</SelectItem>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}
