const express = require('express');
const app = express();
require("dotenv").config();
const ImageKit = require('imagekit');
const mongoose = require('mongoose');
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


app.post("/api/chats", async (req, res) => {
    const userId = req.auth.userId;
    const { text } = req.body;

    try {
        // CREATE A NEW CHAT
        const newChat = new Chat({
            userId: userId,
            history: [{ role: "user", parts: [{ text }] }],
        });

        const savedChat = await newChat.save();

        // CHECK IF THE USERCHATS EXISTS
        const userChats = await UserChats.find({ userId: userId });

        // IF DOESN'T EXIST CREATE A NEW ONE AND ADD THE CHAT IN THE CHATS ARRAY
        if (!userChats.length) {
            const newUserChats = new UserChats({
                userId: userId,
                chats: [
                    {
                        _id: savedChat._id,
                        title: text.substring(0, 40),
                    },
                ],
            });

            await newUserChats.save();
        } else {
            // IF EXISTS, PUSH THE CHAT TO THE EXISTING ARRAY
            await UserChats.updateOne(
                { userId: userId },
                {
                    $push: {
                        chats: {
                            _id: savedChat._id,
                            title: text.substring(0, 40),
                        },
                    },
                }
            );

            res.status(201).send(newChat._id);
        }
    } catch (err) {
        console.log(err);
        res.status(500).send("Error creating chat!");
    }
});



const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGO);
        console.log("Connected to MongoDB");
    } catch (err) {
        console.log(err);
    }
};

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connect();
});

