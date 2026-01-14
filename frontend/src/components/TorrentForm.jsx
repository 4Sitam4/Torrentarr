import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:3000/api';

const TorrentForm = ({ selectedSource, onSuccess, onProcess }) => {
    const [announceUrl, setAnnounceUrl] = useState('https://');
    const [outputName, setOutputName] = useState('');
    const [pieceSize, setPieceSize] = useState(21);
    const [nfoFile, setNfoFile] = useState(null);

    useEffect(() => {
        if (selectedSource) {
            // Auto-suggest name from path
            const parts = selectedSource.split('/');
            const name = parts[parts.length - 1] || parts[parts.length - 2];
            if (name) setOutputName(name + '.torrent');
        }
    }, [selectedSource]);

    const handleNfoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Upload immediately
        const formData = new FormData();
        formData.append('nfo', file);

        try {
            const res = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.path) {
                setNfoFile(data.path); // Path where NFO is stored
                onSuccess(`NFO Uploaded to: ${data.path}`);
            }
        } catch (err) {
            onSuccess(`Error uploading NFO: ${err.message}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedSource) {
            alert('Please select a source first!');
            return;
        }

        onProcess(true);
        onSuccess('Starting mktorrent...');

        try {
            const res = await fetch(`${API_BASE}/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourcePath: selectedSource,
                    announceUrl,
                    outputName,
                    pieceSize,
                    nfoPath: nfoFile
                })
            });

            const data = await res.json();
            if (data.success) {
                // Extract filename from outputPath for download
                // outputPath is absolute, we need basename
                const createdFileName = data.outputPath.split('/').pop();
                onSuccess(data.logs + '\n\nSUCCESS! Torrent created at: ' + data.outputPath, createdFileName);
            } else {
                onSuccess(data.logs + '\n\nERROR: ' + data.error, null);
            }
        } catch (err) {
            onSuccess('Request Failed: ' + err.message);
        } finally {
            onProcess(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>Announce URL</label>
                <input
                    className="form-control"
                    type="text"
                    value={announceUrl}
                    onChange={(e) => setAnnounceUrl(e.target.value)}
                    required
                />
            </div>

            <div className="form-group">
                <label>Selected Source</label>
                <input
                    className="form-control"
                    type="text"
                    value={selectedSource || 'No source selected'}
                    readOnly
                    disabled
                />
            </div>

            <div className="form-group">
                <label>Output Filename</label>
                <input
                    className="form-control"
                    type="text"
                    value={outputName}
                    onChange={(e) => setOutputName(e.target.value)}
                    placeholder="archive.torrent"
                    required
                />
            </div>

            <div className="form-group">
                <label>Piece Size (2^n)</label>
                <select
                    className="form-control"
                    value={pieceSize}
                    onChange={(e) => setPieceSize(Number(e.target.value))}
                >
                    <option value="18">18 (256 KB)</option>
                    <option value="19">19 (512 KB)</option>
                    <option value="20">20 (1 MB)</option>
                    <option value="21">21 (2 MB)</option>
                    <option value="22">22 (4 MB)</option>
                    <option value="23">23 (8 MB)</option>
                    <option value="24">24 (16 MB)</option>
                    <option value="25">25 (32 MB)</option>
                </select>
            </div>

            <div className="form-group">
                <label>Upload NFO (Optional)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="file"
                        accept=".nfo"
                        onChange={handleNfoChange}
                        style={{ color: '#adb5bd' }}
                    />
                    {nfoFile && <span style={{ color: '#4dabf7' }}>Uploaded!</span>}
                </div>
            </div>

            <button type="submit" className="btn">Create Torrent</button>
        </form>
    );
};

export default TorrentForm;
