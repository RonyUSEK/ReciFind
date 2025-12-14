import React, { useEffect, useMemo, useRef, useState } from 'react';

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * Reusable ingredient picker search bar (chips + autocomplete).
 *
 * Keyboard:
 * - ↑/↓: move highlight
 * - Enter: choose highlighted option; or submit when empty (optional)
 * - Tab: choose highlighted option (keeps it quick)
 * - Esc: clear input / close
 */
const IngredientSearchBar = ({
  selectedValues = [],
  chips = null,
  inputValue,
  setInputValue,
  allSuggestions = [],
  onAdd,
  onEnterWhenEmpty,
  placeholder,
  actions = null,
  className = '',
  inputId,
  disabled = false,
  helpText = 'Use ↑↓ to navigate, Enter to select, Esc to close',
  maxSuggestions = 8,
  showCustomAddWhenNoMatch = true,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const blurTimerRef = useRef(null);

  useEffect(() => {
    setActiveIndex(-1);
  }, [inputValue]);

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
      }
    };
  }, []);

  const selectedSet = useMemo(() => {
    return new Set((selectedValues || []).map(normalize).filter(Boolean));
  }, [selectedValues]);

  const query = normalize(inputValue);

  const filteredSuggestions = useMemo(() => {
    if (!query) return [];
    return (allSuggestions || [])
      .map(String)
      .filter((s) => normalize(s).includes(query))
      .filter((s) => !selectedSet.has(normalize(s)))
      .slice(0, maxSuggestions);
  }, [allSuggestions, maxSuggestions, query, selectedSet]);

  // PC-friendly: only show a dedicated "Add \"...\"" option when there are *no* matches.
  const showCustomAdd =
    showCustomAddWhenNoMatch &&
    isFocused &&
    query &&
    filteredSuggestions.length === 0 &&
    !selectedSet.has(query);

  const items = useMemo(() => {
    if (!isFocused || !query) return [];
    if (filteredSuggestions.length > 0) {
      return filteredSuggestions.map((s) => ({ type: 'suggestion', value: s }));
    }
    if (showCustomAdd) {
      return [{ type: 'custom', value: String(inputValue || '').trim() }];
    }
    return [];
  }, [filteredSuggestions, inputValue, isFocused, query, showCustomAdd]);

  const listboxId = inputId ? `${inputId}__listbox` : undefined;
  const optionId = (idx) => (inputId ? `${inputId}__option_${idx}` : undefined);

  const closeList = () => {
    setActiveIndex(-1);
    setIsFocused(false);
  };

  const commitAdd = (raw) => {
    const value = String(raw || '').trim();
    if (!value) return;
    onAdd?.(value);
    setInputValue('');
    setActiveIndex(-1);
  };

  const onKeyDown = (e) => {
    if (disabled) return;

    if (e.key === 'ArrowDown') {
      if (items.length === 0) return;
      e.preventDefault();
      setActiveIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
      return;
    }

    if (e.key === 'ArrowUp') {
      if (items.length === 0) return;
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : -1));
      return;
    }

    if (e.key === 'Enter') {
      if (!query) {
        if (typeof onEnterWhenEmpty === 'function') {
          e.preventDefault();
          onEnterWhenEmpty();
        }
        return;
      }

      e.preventDefault();

      if (activeIndex >= 0 && items[activeIndex]) {
        commitAdd(items[activeIndex].value);
        return;
      }

      // If there's an exact match, treat Enter as selecting it.
      const exact = filteredSuggestions.find((s) => normalize(s) === query);
      if (exact) {
        commitAdd(exact);
        return;
      }

      // Only allow custom add when there are no matches.
      if (showCustomAdd) {
        commitAdd(String(inputValue || '').trim());
      }
      return;
    }

    if (e.key === 'Tab') {
      if (activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        commitAdd(items[activeIndex].value);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setInputValue('');
      setActiveIndex(-1);
      return;
    }
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center p-2 gap-2">
        <div className="flex items-center flex-1 min-w-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 mx-2 sm:mx-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>

          <div className="flex flex-wrap items-center flex-grow py-1 gap-2 min-w-0">
            {chips}

            <input
              id={inputId}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => {
                if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                setIsFocused(true);
              }}
              onBlur={() => {
                if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                blurTimerRef.current = setTimeout(() => closeList(), 120);
              }}
              className="flex-grow min-w-[120px] py-2 bg-transparent text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none text-base sm:text-lg"
              placeholder={placeholder}
              disabled={disabled}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={items.length > 0}
              aria-controls={items.length > 0 ? listboxId : undefined}
              aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
            />
          </div>
        </div>

        {actions}
      </div>

      {items.length > 0 && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 z-20 max-h-[60vh] overflow-y-auto"
        >
          <div className="p-3">
            {items.map((item, idx) => {
              const isSelected = idx === activeIndex;
              const isCustom = item.type === 'custom';

              return (
                <button
                  key={`${item.type}-${item.value}-${idx}`}
                  id={optionId(idx)}
                  role="option"
                  aria-selected={isSelected}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commitAdd(item.value)}
                  className={`w-full flex items-center justify-between text-base px-4 py-3 rounded-xl transition duration-150 font-medium mb-2 last:mb-0 ${
                    isCustom
                      ? `bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white shadow-md ${
                          isSelected ? 'ring-2 ring-blue-300 ring-offset-2 dark:ring-offset-gray-800' : ''
                        }`
                      : `bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 active:bg-gray-200 dark:active:bg-gray-500 ${
                          isSelected
                            ? 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-800 bg-gray-100 dark:bg-gray-600'
                            : ''
                        }`
                  }`}
                >
                  <span className="truncate">
                    {isCustom ? `Add "${item.value}"` : item.value}
                  </span>
                  <span className={`font-bold text-lg leading-none ml-2 ${isCustom ? '' : 'text-green-600 dark:text-green-400'}`}>+</span>
                </button>
              );
            })}

            {helpText ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                {helpText}
              </p>
            ) : null}
          </div>
        </div>
      )}

      {isFocused && query && items.length === 0 && showCustomAddWhenNoMatch ? (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          No matches. Press Enter to add.
        </div>
      ) : null}
    </div>
  );
};

export default IngredientSearchBar;
