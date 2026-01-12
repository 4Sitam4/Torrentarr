import React, { useState, useEffect } from 'react';
import FileBrowser from './components/FileBrowser';
import TorrentForm from './components/TorrentForm';
import './App.css';
import { FolderOpen, Upload, Terminal } from 'lucide-react';

function App() {
  const [selectedSource, setSelectedSource] = useState('');
  const [logs, setLogs] = useState('');
  const [downloadFile, setDownloadFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1><Upload className="icon" /> Torrentarr</h1>
        <p>Simple WebUI for mktorrent</p>
      </header>

      <main className="app-main">
        <section className="section source-section">
          <div className="section-header">
            <FolderOpen className="icon" />
            <h2>Select Source</h2>
          </div>
          <FileBrowser onSelect={setSelectedSource} selected={selectedSource} />
        </section>

        <section className="section config-section">
          <div className="section-header">
            <Terminal className="icon" />
            <h2>Configuration</h2>
          </div>
          <TorrentForm
            selectedSource={selectedSource}
            onSuccess={(logs, fileName) => {
              setLogs(logs);
              setDownloadFile(fileName);
            }}
            onProcess={(status) => setIsProcessing(status)}
          />
        </section>
      </main>

      {downloadFile && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <a
            href={`http://localhost:3000/api/download?file=${downloadFile}`}
            className="btn"
            style={{ maxWidth: '300px', margin: '0 auto', background: '#40c057', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            download
          >
            <Upload className="icon" style={{ transform: 'rotate(180deg)' }} /> Download .torrent
          </a>
        </div>
      )}

      {logs && (
        <footer className="app-logs">
          <h3>Output Log</h3>
          <pre>{logs}</pre>
        </footer>
      )}
    </div>
  );
}

export default App;
