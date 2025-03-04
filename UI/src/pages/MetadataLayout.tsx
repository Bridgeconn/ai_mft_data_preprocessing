import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format, parse } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

interface MetadataData {
  [key: string]: any;
}

interface MetadataLayoutProps {
  data: MetadataData;
  onChange: (event: { name: string; value: any }) => void;
}

interface DatePickerFieldProps {
  name: string;
  value: string | null;
}

const MetadataLayout: React.FC<MetadataLayoutProps> = ({ data, onChange }) => {
  const content = data;
  const requiredFields = ["Project ID", "Project Name"];
  const typeOptions = ["Bible", "Biblical Resource"];
  const formatOptions = ["Text", "Audio", "Visual"];
  const fieldOrder = [
    "Project Name",
    "Project ID",
    "Start Date",
    "End Date",
    "Type",
    "Format",
    "Country",
    "Publisher",
    "Copyright Status",
    "Contract Tenures",
    "Version",
    "Project Manager",
    "Language",
    "Link",
    "Related Gateway Language",
    "Source Text",
    "Source File",
    "Localised Files Links",
    "Remarks",
    "License",
    "Digital Platform Links",
    "DBL Link",
  ];

  const DatePickerField: React.FC<DatePickerFieldProps> = ({ name, value }) => {
    const dateValue = value
      ? parse(value, "dd/MM/yyyy", new Date())
      : undefined;
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
            {value ? (
              value
            ) : (
              <span className="text-muted-foreground">Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={dateValue || undefined}
            onSelect={(date) => {
              const formattedDate = date ? format(date, "dd/MM/yyyy") : null;
              onChange({ name, value: formattedDate });
            }}
          />
        </PopoverContent>
      </Popover>
    );
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    onChange({ name: e.target.name, value: e.target.value });
  };

  const renderField = (key: string) => {
    const isRequired = requiredFields.includes(key);
    const value = (content && content[key]) || "";

    switch (key) {
      case "Type":
        return (
          <Select
            value={value}
            onValueChange={(newValue) =>
              onChange({ name: key, value: newValue })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "Format":
        return (
          <Select
            value={value}
            onValueChange={(newValue) =>
              onChange({ name: key, value: newValue })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formatOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "Start Date":
      case "End Date":
        return <DatePickerField name={key} value={value} />;

      case "Remarks":
      case "License":
        return (
          <Textarea
            name={key}
            value={value}
            onChange={handleInputChange}
            className="min-h-[80px]"
          />
        );

      default:
        return (
          <Input
            name={key}
            value={value}
            onChange={handleInputChange}
            className={isRequired && !value ? "border-red-500" : ""}
          />
        );
    }
  };

  return (
    <div className="max-w-8xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-10 mb-4">
        {fieldOrder.map((key) => (
          <div key={key} className="space-y-0">
            <Label className="text-sm font-light">
              {requiredFields.includes(key) ? `${key} *` : key}
            </Label>
            {renderField(key)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MetadataLayout;
