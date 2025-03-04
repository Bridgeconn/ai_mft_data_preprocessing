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
declare const MultiSelect: ({ options, value, clearable, onChange, placeholder, }: MultiSelectProps) => import("react/jsx-runtime").JSX.Element;
export default MultiSelect;
