const express = require('express');
const multer = require('multer');
const path = require('node:path');
const fs = require('node:fs');

const api = express();
api.use(require('cors')())

const PORT = 3005;

const storage = multer.diskStorage({
    destination: function(r, file, callback) {
        callback(null, 'uploads/');
    },
    filename: function(r, file, callback) {
        callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    },
});

const audioStorage = multer.diskStorage({
    destination: function(r, file, callback) {
        const audioDir = path.join(__dirname, 'audio');
        if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir);
        callback(null, 'audio/');
    },
    filename: function(r, file, callback) {
        callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    },
});

const uploadAudio = multer({storage: audioStorage});

const upload = multer({storage: storage});

//* On demand creates the uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

api.post(
    '/upload',
    upload.single('video'),
    (r, w) => {
        r.file
            ? w.json({filename: r.file.filename})
            : w.status(400).send('Video upload failed');
    }
);

api.get('/video/:filename', (r, w) => {
    const filePath = path.join(uploadsDir, r.params.filename);
    fs.stat(filePath, (err, stat) => {
        if (err) {
            console.error(err);
            return w.status(404).end();
        }

        const fileSize = stat.size;
        const range = r.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            const chunkSize = (end - start) + 1;
            const file = fs.createReadStream(filePath, {start, end});

            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': 'video/mp4',
            };

            w.writeHead(206, head);
            file.pipe(w);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            w.writeHead(200, head);
            fs.createReadStream(filePath).pipe(w);
        }
    });
});

api.post('/upload-audio', uploadAudio.single('voice'), (r, w) => {
    console.log('Received request for /upload-audio');

    r.file
        ? w.json({id: r.file.filename})
        : w.status(400).send('Voice upload failed');
});

api.use('/audio', express.static(path.join(__dirname, 'audio')));


// api.get('/audio/:filename', (r, w) => {
//     const filePath = path.join(__dirname, 'audio', r.params.filename);
//     fs.stat(filePath, (err, stat) => {
//         if (err) {
//             console.error(err);
//             return w.status(404).end();
//         }
//         w.writeHead(200, {'Content-Type': 'audio/mpeg'});
//         fs.createReadStream(filePath).pipe(w);
//     });
// });


api.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
