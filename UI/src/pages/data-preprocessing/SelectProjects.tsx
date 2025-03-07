import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface SelectProjectsProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: { 
    name: string; 
    label: string; 
  }[];
  className?: string;
  disabled?: boolean;
}

const SelectProjects: React.FC<SelectProjectsProps> = ({
  value,
  onValueChange,
  placeholder,
  options,
  className,
  disabled = false
}) => {
  return (
    <Select 
      value={value} 
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((repo) => (
          <SelectItem 
            key={repo.name} 
            value={repo.name}
          >
            {repo.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default SelectProjects;