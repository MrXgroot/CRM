import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  Children,
  isValidElement,
} from "react";
import { createPortal } from "react-dom";
import { UseFormRegisterReturn } from "react-hook-form";
import "./Select.css";

interface SearchableSelectFieldProps {
  label?: string;
  name?: string;
  value?: string;
  placeholder?: string;
  styleClass?: string;
  required?: boolean;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  children?: React.ReactNode;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  register?: UseFormRegisterReturn;
}

interface ParsedOption {
  value: string;
  label: string;
}

function extractOptions(children: React.ReactNode): ParsedOption[] {
    const options: ParsedOption[] = [];
    Children.forEach(children, (child) => {
        if (!isValidElement(child)) return;
        if (child.type === "option") {
        const props = child.props as { value?: string; children?: React.ReactNode };
        const value = props.value ?? "";

        // Flatten array children into a single string without commas
        const label = Children.toArray(props.children)
            .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : ""))
            .join("");

        options.push({ value, label });
        } else {
        const props = child.props as { children?: React.ReactNode };
        if (props.children) {
            options.push(...extractOptions(props.children));
        }
        }
    });
    return options;
}

const SearchableSelectField = React.forwardRef<
  HTMLSelectElement,
  SearchableSelectFieldProps
>(
  (
    {
      label,
      name,
      value: controlledValue,
      placeholder = "Search or select...",
      styleClass = "",
      required,
      disabled,
      error,
      errorMessage,
      children,
      onChange,
      onBlur,
      register,
    },
    _ref
  ) => {
    const allOptions = extractOptions(children);
    const effectiveValue = controlledValue !== undefined ? controlledValue : "";

    const [searchText, setSearchText] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [internalValue, setInternalValue] = useState(effectiveValue);

    const fieldId = useRef(`searchable-select-${Math.random()}`);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const hiddenSelectRef = useRef<HTMLSelectElement | null>(null);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

    const updateDropdownPos = useCallback(() => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom,
                left: rect.left,
                width: rect.width
            });
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            updateDropdownPos();
            window.addEventListener("scroll", updateDropdownPos, true);
            window.addEventListener("resize", updateDropdownPos);
            return () => {
                window.removeEventListener("scroll", updateDropdownPos, true);
                window.removeEventListener("resize", updateDropdownPos);
            };
        }
    }, [isOpen, updateDropdownPos]);

    useEffect(() => {
      setInternalValue(effectiveValue);
    }, [effectiveValue]);

    useEffect(() => {
        if (controlledValue !== undefined && controlledValue !== internalValue) {
            setInternalValue(controlledValue);
        }
    }, [controlledValue]);

    const selectedOption = allOptions.find((o) => o.value === internalValue);
    const selectedLabel = selectedOption?.label ?? "";

    const filteredOptions = allOptions.filter(
      (o) =>
        o.value === "" ||
        o.label.toLowerCase().includes(searchText.toLowerCase())
    );

    useEffect(() => {
      const handleOutside = (e: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setIsOpen(false);
          setSearchText("");
        }
      };

      const handleCloseAll = (e: Event) => {
        const customEvt = e as CustomEvent<{ sourceId?: string }>;
        if (customEvt.detail?.sourceId === fieldId.current) {
          return;
        }
        setIsOpen(false);
        setSearchText("");
      };

      document.addEventListener("mousedown", handleOutside);
      window.addEventListener("app:close-dropdowns", handleCloseAll);

      return () => {
        document.removeEventListener("mousedown", handleOutside);
        window.removeEventListener("app:close-dropdowns", handleCloseAll);
      };
    }, []);

    const fireChange = useCallback((newValue: string) => {
      const selectEl = hiddenSelectRef.current;
      if (!selectEl) return;
      Object.getOwnPropertyDescriptor(
        window.HTMLSelectElement.prototype,
        "value"
      )?.set?.call(selectEl, newValue);
      const event = new Event("change", { bubbles: true });
      selectEl.dispatchEvent(event);
    }, []);

    const handleSelect = useCallback(
      (option: ParsedOption) => {
        setInternalValue(option.value);
        setSearchText("");
        setIsOpen(false);
        fireChange(option.value);
      },
      [fireChange]
    );

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      setInternalValue("");
      setSearchText("");
      fireChange("");
    };

    const handleOpen = () => {
      if (disabled) return;
      setIsOpen((prev) => {
        const next = !prev;
        if (next) {
          window.dispatchEvent(
            new CustomEvent("app:close-dropdowns", {
              detail: { sourceId: fieldId.current },
            })
          );
          setTimeout(() => inputRef.current?.focus(), 50);
        }
        return next;
      });
    };

    const handleBlur = useCallback(() => {
      const selectEl = hiddenSelectRef.current;
      if (!selectEl) return;
      const event = new FocusEvent("blur", { bubbles: true });
      selectEl.dispatchEvent(event);
    }, []);

    return (
      <div
        className={`select-field ${error ? "error" : ""} flex flex-col justify-end flex-wrap mx-2 ${styleClass}`}
        ref={containerRef}
      >
        <select
          ref={(el) => {
            hiddenSelectRef.current = el;
            if (typeof register?.ref === "function") register.ref(el);
            if (typeof _ref === "function") _ref(el);
            else if (_ref) (_ref as React.MutableRefObject<HTMLSelectElement | null>).current = el;
          }}
          name={register?.name ?? name}
          value={internalValue}
          onChange={(e) => {
            setInternalValue(e.target.value);
            register?.onChange?.(e);
            onChange?.(e);
          }}
          onBlur={(e) => {
            register?.onBlur?.(e);
            onBlur?.(e);
          }}
          style={{ display: "none" }}
          tabIndex={-1}
          aria-hidden="true"
        >
          {allOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {label && (
          <label className="w-full" htmlFor={name}>
            {label}
            {required && <span style={{ color: "red" }}>*</span>}
          </label>
        )}

        <div className="relative">
          <div
            ref={triggerRef}
            onClick={handleOpen}
            onBlur={handleBlur}
            tabIndex={disabled ? -1 : 0}
            role="combobox"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            className={[
              "h-8 w-full rounded border py-1 px-2 text-sm shadow-sm",
              "flex items-center justify-between cursor-pointer bg-white",
              "focus:outline-none focus:ring-1 focus:ring-violet-400",
              error
                ? "border-red-400 bg-red-50"
                : "border-gray-400 hover:border-gray-500",
              disabled ? "opacity-60 cursor-not-allowed bg-gray-100" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span
              className={`truncate text-sm ${
                !selectedLabel ? "text-gray-400" : "text-gray-800"
              }`}
            >
              {selectedLabel || placeholder}
            </span>

            <div className="flex items-center gap-1 ml-1 shrink-0">
              {internalValue && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  title="Clear"
                  tabIndex={-1}
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}

              <svg
                className={`w-3 h-3 text-gray-500 transition-transform duration-150 ${
                  isOpen ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          {isOpen && typeof document !== "undefined" && createPortal(
            <div 
              className="fixed z-[9999] bg-white border border-gray-300 rounded shadow-lg"
              style={{
                top: dropdownPos?.top,
                left: dropdownPos?.left,
                width: dropdownPos?.width,
                marginTop: '4px'
              }}
            >
              <div className="p-1.5 border-b border-gray-200">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Type to search..."
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded outline-none focus:border-violet-400"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <ul className="max-h-48 overflow-y-auto py-1" role="listbox">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option, index) => (
                    <li
                      key={index}
                      role="option"
                      aria-selected={option.value === internalValue}
                      onClick={() => handleSelect(option)}
                      className={[
                        "px-3 py-1.5 text-sm cursor-pointer",
                        option.value === ""
                          ? "text-gray-400 hover:bg-gray-50"
                          : "text-gray-700 hover:bg-violet-50 hover:text-violet-700",
                        option.value === internalValue && option.value !== ""
                          ? "bg-violet-100 text-violet-800 font-medium"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {option.label}
                    </li>
                  ))
                ) : (
                  <li className="px-3 py-2 text-sm text-gray-400 text-center">
                    No results found
                  </li>
                )}
              </ul>
            </div>,
            document.body
          )}
        </div>

        <span className="text-[10px] text-red-400 min-h-[10px] ml-1">
          {error ? errorMessage : ""}
        </span>
      </div>
    );
  }
);

SearchableSelectField.displayName = "SearchableSelectField";
export default SearchableSelectField;
