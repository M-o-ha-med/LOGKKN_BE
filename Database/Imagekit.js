const multer = require('multer');
const path = require('path');
require('dotenv').config(); 
const ImageKit = require('imagekit');
const pool = require('./db');

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});


const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowedTypes.test(file.mimetype);

    if (extName && mimeType) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed'), false);
    }
};

const imageKitStorage = {
    _handleFile(req, file, cb) {
        const chunks = [];

        // Collect the file stream into a buffer
        file.stream.on('data', (chunk) => {
            chunks.push(chunk);
        });

        file.stream.on('end', () => {
            const fileBuffer = Buffer.concat(chunks);

            // Upload to ImageKit
            const result  = imagekit.upload(
                {
                    file: fileBuffer, // File as a Buffer
                    fileName: `${Date.now()}-${file.originalname}`, // Unique file name
                },
                (err, result) => {
                    if (err) {
                        return cb(err);
                    }

                    cb(null, {
                        path: result.url,
                        filename: result.name,
						fileid : result.fileId
                    });
                }
            );
			
			
			
        });

        file.stream.on('error', (err) => cb(err));
    },
	

    _removeFile(req, file, cb) {
        cb(null);
    }
};

const deleteImage = (fileid) => {
    return new Promise((resolve, reject) => {
        imagekit.deleteFile(fileid, function(err, result) {
            if (err) {
                console.error(err);
                return reject(err);
            }
            console.log(result);
            resolve(result);
        });
    });
};


// Setup multer with the custom storage engine
const upload = multer({
    storage: imageKitStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 20 * 1024 * 1024, // Limit to 20MB
    },
});

module.exports = {upload , deleteImage , imagekit};