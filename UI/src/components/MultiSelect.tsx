import Select from "react-select";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: Option[];
  clearable?: boolean;
  onChange: (newValue: Option[]) => void;
  placeholder?: string;
}

const MultiSelect = ({
  options,
  value,
  clearable,
  onChange,
  placeholder = "Select items...",
}: MultiSelectProps) => {
  return (
    <Select
      isMulti
      // closeMenuOnSelect={false}
      // hideSelectedOptions={false}
      // isSearchable
      // menuPosition="fixed"
      styles={{
        control: (base) => ({
          ...base,
          borderRadius: "5px",
          borderColor: "muted-foreground",
          color: "foreground",
          cursor: "pointer",
          padding: "0px",
          margin: "0px",
          fontSize: "15px",
        }),
        option: (base) => ({
          ...base,
          cursor: "pointer",
          padding: "4px",
          fontSize: "15px",
          width: "100%",
        }),
      }}
      isClearable={clearable}
      options={options}
      value={value}
      onChange={(newValue) => onChange(newValue as Option[])}
      placeholder={placeholder}
    />
  );
};

export default MultiSelect;
