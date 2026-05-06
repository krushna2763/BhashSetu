import { useState, useRef, useEffect } from 'react';

export default function SimpleSelect({ value, onValueChange, options, className = "", placeholder = "Select an option", "data-testid": dataTestId }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options?.find(option => option.value === value);

  return (
    <div ref={selectRef} className={`relative w-full ${className}`} data-testid={dataTestId}>
      <button
        type="button"
        className="min-h-[64px] w-full rounded-xl border-2 border-gray-300 bg-white px-6 text-xl text-gray-900 shadow-sm hover:border-[#1a3a6b] focus:ring-4 focus:ring-[#1a3a6b]/20 flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <svg
          className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-300 rounded shadow-lg z-50"
          style={{
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            maxHeight: '240px',
            overflowY: 'auto'
          }}
        >
          {options?.map((option) => (
            <div
              key={option.value}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
              onClick={() => {
                onValueChange(option.value);
                setIsOpen(false);
              }}
              role="option"
              style={{
                fontSize: '16px',
                color: '#333',
                padding: '12px 16px'
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
