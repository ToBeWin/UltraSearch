import React from 'react';

interface SearchBarProps {
    query: string;
    onQueryChange: (query: string) => void;
    onSearch: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ query, onQueryChange, onSearch }) => {
    return (
        <div>
            <input
                type="text"
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="搜索文件"
            />
            <button onClick={onSearch}>搜索</button>
        </div>
    );
};

export default SearchBar;
