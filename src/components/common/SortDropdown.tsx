import React, { useState, useRef, useEffect } from 'react';
import './SortDropdown.css';

export type SortOption = {
  id: string;
  label: string;
};

interface SortDropdownProps {
  options: SortOption[];
  selectedOption: SortOption;
  onSelect: (option: SortOption) => void;
}

const SortDropdown: React.FC<SortDropdownProps> = ({ options, selectedOption, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleOptionClick = (option: SortOption) => {
    onSelect(option);
    setIsOpen(false);
  };

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="sort-dropdown" ref={dropdownRef}>
      <button className="sort-dropdown-toggle" onClick={toggleDropdown}>
        <i className="fas fa-sort-amount-down"></i>
        <span className="sort-label" style={{ color: '#000', fontWeight: 500 }}>{selectedOption.label}</span>
        <i className={`fas fa-chevron-${isOpen ? 'up' : 'down'} arrow-icon`}></i>
      </button>
      {isOpen && (
        <div className="sort-dropdown-menu">
          {options.map(option => (
            <div
              key={option.id}
              className={`sort-dropdown-item ${option.id === selectedOption.id ? 'active' : ''}`}
              onClick={() => handleOptionClick(option)}
            >
              <div className="sort-option-check">
                {option.id === selectedOption.id && <i className="fas fa-check"></i>}
              </div>
              <span style={{ color: '#000', fontWeight: 500 }}>{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SortDropdown; 