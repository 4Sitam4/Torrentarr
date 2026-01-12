import React, { useState, useEffect } from 'react';
import { Folder, File, ArrowUp, ChevronRight } from 'lucide-react';

const API_BASE = 'http://localhost:3000/api';

const FileBrowser = ({ onSelect, selected }) => {
    const [currentPath, setCurrentPath] = useState('');
    const [items, setItems] = useState([]);
    const [parentPath, setParentPath] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchPath = async (path = '') => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/files?path=${encodeURIComponent(path)}`);
            const data = await res.json();
            setCurrentPath(data.currentPath);
            setParentPath(data.parentPath);
            setItems(data.files || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPath(); // Load default (root)
    }, []);

    const handleItemClick = (item) => {
        if (item.isDirectory) {
            fetchPath(item.path);
        } else {
            onSelect(item.path);
        }
    };

    const handleSelectDir = (path, e) => {
        e.stopPropagation();
        onSelect(path);
    };

    return (
        <div className="file-browser">
            <div className="path-nav">
                {parentPath && (
                    <button className="nav-btn" onClick={() => fetchPath(parentPath)}>
                        <ArrowUp size={16} /> Up
                    </button>
                )}
                <div style={{ padding: '0.4rem', color: '#adb5bd', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Current: {currentPath || '/'}
                </div>
            </div>

            <div className="file-list">
                {loading ? <div style={{ padding: '1rem' }}>Loading...</div> : items.map((item) => (
                    <div
                        key={item.path}
                        className={`file-item ${selected === item.path ? 'selected' : ''}`}
                        onClick={() => handleItemClick(item)}
                    >
                        <div className="file-icon">
                            {item.isDirectory ? <Folder size={18} color="#ffd43b" /> : <File size={18} />}
                        </div>
                        <div className="file-info">
                            <span className="file-name">{item.name}</span>
                            <span className="file-size">{item.size}</span>
                        </div>
                        {item.isDirectory && (
                            <button
                                className="nav-btn"
                                style={{ marginLeft: '1rem', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                                onClick={(e) => handleSelectDir(item.path, e)}
                            >
                                Select Dir
                            </button>
                        )}
                    </div>
                ))}
                {items.length === 0 && !loading && <div style={{ padding: '1rem' }}>Empty directory</div>}
            </div>

            {currentPath && (
                <div style={{ marginTop: '0.5rem' }}>
                    <button className="btn" style={{ background: '#343a40' }} onClick={() => onSelect(currentPath)}>Select Current Directory</button>
                </div>
            )}
        </div>
    );
};

export default FileBrowser;
