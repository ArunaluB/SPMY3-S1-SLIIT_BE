const express = require('express');
const app = express();
require("dotenv").config();
const ImageKit = require('imagekit');

const PORT = process.env.PORT || 3000;
app.use(express.json());

const cors = require('cors');
app.use(cors({
    credentials: true,
    origin: 'http://localhost:5173',
}));

const imagekit = new ImageKit({
    urlEndpoint: process.env.IMAGE_KIT_ENDPOINT,
    publicKey: process.env.IMAGE_KIT_PUBLIC_KEY,
    privateKey: process.env.IMAGE_KIT_PRIVATE_KEY,
});

app.get("/api/upload", (req, res) => {
    const result = imagekit.getAuthenticationParameters();
    res.send(result);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

