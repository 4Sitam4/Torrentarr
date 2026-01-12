const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || '/data'; // Directory to browse/select source
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/output'; // Directory to save torrents

app.use(cors());
app.use(express.json());

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('Server configured with:');
console.log('DATA_DIR:', DATA_DIR);
console.log('OUTPUT_DIR:', OUTPUT_DIR);

// Serve Frontend Static Files
app.use(express.static(path.join(__dirname, 'public')));


// --- Helpers ---
const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// --- API Endpoints ---

// 1. List Files
app.get('/api/files', (req, res) => {
    const reqPath = req.query.path ? path.resolve(req.query.path) : DATA_DIR;

    // Security check: ensure we don't go above root path if strict mode is needed,
    // but for this container, we trust the mounts. 
    // However, let's default to DATA_DIR if query is empty.
    
    // Check if path exists
    if (!fs.existsSync(reqPath)) {
        return res.status(404).json({ error: 'Path not found' });
    }

    try {
        const stats = fs.statSync(reqPath);
        if (!stats.isDirectory()) {
            return res.json({ 
                path: reqPath,
                files: []
            });
        }

        const files = fs.readdirSync(reqPath).map(file => {
            const absolutePath = path.join(reqPath, file);
            try {
                const fileStats = fs.statSync(absolutePath);
                return {
                    name: file,
                    path: absolutePath,
                    isDirectory: fileStats.isDirectory(),
                    size: fileStats.isDirectory() ? '-' : formatSize(fileStats.size),
                    bytes: fileStats.size
                };
            } catch (err) {
                return null;
            }
        }).filter(Boolean);

        // Sort: Directories first, then files
        files.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) {
                return a.name.localeCompare(b.name);
            }
            return a.isDirectory ? -1 : 1;
        });

        res.json({
            currentPath: reqPath,
            parentPath: reqPath === DATA_DIR ? null : path.dirname(reqPath),
            files
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Upload NFO
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Upload to a temp dir first, or directly to OUTPUT_DIR
        // The user request is "upload NFO", likely to include with the torrent.
        // We'll upload to the OUTPUT_DIR for simplicity, or the source provided in body?
        // Multer runs before body is parsed completely in some setups, but here we can use query or just default.
        cb(null, OUTPUT_DIR);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('nfo'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ message: 'NFO uploaded successfully', path: req.file.path });
});

// 3. Download Torrent
app.get('/api/download', (req, res) => {
    const fileName = req.query.file;
    if (!fileName) {
        return res.status(400).json({ error: 'Missing file parameter' });
    }

    // Security: Ensure we only download from OUTPUT_DIR and prevent traversal
    const safeFileName = path.basename(fileName);
    const filePath = path.join(OUTPUT_DIR, safeFileName);
    console.log('Download request for:', fileName, 'Resolved path:', filePath);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, safeFileName, (err) => {
        if (err) {
            console.error('Download error:', err);
            // Don't send another response if headers already sent
            if (!res.headersSent) {
                res.status(500).json({ error: 'Download failed' });
            }
        }
    });
});

// 4. Create Torrent
app.post('/api/create', (req, res) => {
    // Expect: { sourcePath, announceUrl, pieceSize, outputName }
    const { sourcePath, announceUrl, pieceSize, outputName } = req.body;

    if (!sourcePath || !announceUrl || !outputName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Sanitize output name
    let safeOutputName = outputName;
    if (!safeOutputName.endsWith('.torrent')) {
        safeOutputName += '.torrent';
    }
    const outputPath = path.join(OUTPUT_DIR, safeOutputName);

    // Build mktorrent command
    // mktorrent -v -p -l <pieceSize> -a <announceUrl> -o <outputPath> <sourcePath>
    const args = [
        '-v',           // Verbose
        '-p',           // Private tracker (usually default for this context)
        '-l', pieceSize || '21', // Default 2MB (2^21)
        '-a', announceUrl,
        '-o', outputPath,
        sourcePath
    ];

    console.log('Running:', 'mktorrent', args.join(' '));

    const mktorrent = spawn('mktorrent', args);

    // Collect output
    let stdoutData = '';
    let stderrData = '';

    mktorrent.stdout.on('data', (data) => {
        const str = data.toString();
        console.log('[stdout]', str);
        stdoutData += str;
    });

    mktorrent.stderr.on('data', (data) => {
        const str = data.toString();
        console.error('[stderr]', str);
        stderrData += str;
    });

    mktorrent.on('close', (code) => {
        if (code === 0) {
            res.json({ 
                success: true, 
                message: 'Torrent created successfully', 
                outputPath: outputPath,
                logs: stdoutData 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'mktorrent failed', 
                code: code,
                logs: stderrData + stdoutData 
            });
        }
    });

    mktorrent.on('error', (err) => {
        res.status(500).json({ error: 'Failed to start mktorrent process: ' + err.message });
    });
});

// Catch-all removed as we don't use client-side routing and it caused issues with Express 5
// app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${PORT}`);
});
