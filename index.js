
const express = require('express');
const app = express();
require("dotenv").config();
const ImageKit = require('imagekit');
const mongoose = require('mongoose');
const PORT = process.env.PORT || 3000;
app.use(express.json());
const Chat = require("./models/chat.js");
const UserChats = require("./models/userChats.js");
const { ClerkExpressRequireAuth } = require("@clerk/clerk-sdk-node");
const { GoogleGenerativeAI } = require('@google/generative-ai');
// const generatePDFReport = require("./models/generatePDFReport.js");
const { generateBarChartImage, generatePieChartImage } = require("./models/util.js");
// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });



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

app.post("/api/chats", ClerkExpressRequireAuth(), async (req, res) => {
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

// app.get("/api/userchats", ClerkExpressRequireAuth(), async (req, res) => {
//     const userId = req.auth.userId;

//     try {
//         const userChats = await UserChats.find({ userId });

//         res.status(200).send(userChats[0].chats);
//     } catch (err) {
//         console.log(err);
//         res.status(500).send("Error fetching userchats!");
//     }
// });
const questionSchema = new mongoose.Schema({
    question: String,
    options: [String],
    correctAnswer: String,
  });
  
  const Question = mongoose.model('Question', questionSchema);
  
  app.get('/questions', async (req, res) => {
    try {
      const questions = await Question.find();
      res.json(questions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch questions' });
    }
  });
app.get("/api/userchats", ClerkExpressRequireAuth(), async (req, res) => {
    const userId = req.auth.userId;

    try {
        const userChats = await UserChats.find({ userId });

        res.status(200).send(userChats[0].chats);
    } catch (err) {
        console.log(err);
        res.status(500).send("Error fetching userchats!");
    }
});

app.get("/api/chats/:id", ClerkExpressRequireAuth(), async (req, res) => {
    const userId = req.auth.userId;

    try {
        const chat = await Chat.findOne({ _id: req.params.id, userId });

        res.status(200).send(chat);
    } catch (err) {
        console.log(err);
        res.status(500).send("Error fetching chat!");
    }
});

app.put("/api/chats/:id", ClerkExpressRequireAuth(), async (req, res) => {
    const userId = req.auth.userId;

    const { question, answer, img } = req.body;

    const newItems = [
        ...(question
            ? [{ role: "user", parts: [{ text: question }], ...(img && { img }) }]
            : []),
        { role: "model", parts: [{ text: answer }] },
    ];

    try {
        const updatedChat = await Chat.updateOne(
            { _id: req.params.id, userId },
            {
                $push: {
                    history: {
                        $each: newItems,
                    },
                },
            }
        );
        res.status(200).send(updatedChat);
    } catch (err) {
        console.log(err);
        res.status(500).send("Error adding conversation!");
    }
});

app.delete("/api/chats/:id", ClerkExpressRequireAuth(), async (req, res) => {
    const userId = req.auth.userId;
    const chatId = req.params.id;

    try {
        const chat = await Chat.findOne({ _id: chatId, userId });
        if (!chat) {
            return res.status(404).send("Chat not found or you don't have permission to delete this chat.");
        }
        await Chat.deleteOne({ _id: chatId, userId });
        await UserChats.updateOne(
            { userId },
            { $pull: { chats: { _id: chatId } } }
        );
        res.status(200).send({ message: "Chat deleted successfully!" });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting chat!");
    }
});

// Endpoint to handle the AI request
app.post('/api/check-code', async (req, res) => {
    const prompt = `Check this and give some comments: ${req.body.code}`;

    try {
        const result = await model.generateContent(prompt);
        res.json({ response: result.response.text() });
    } catch (error) {
        console.error('Error generating AI content:', error);
        res.status(500).json({ error: 'An error occurred while generating content.' });
    }
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(401).send("Unauthenticated!");
});

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const retryRequest = async (callback, retries = 5, delayMs = 3000) => {
    try {
        return await callback();
    } catch (error) {
        if (retries > 0 && error.status === 429) {
            console.warn(`Rate limit hit. Retrying after ${delayMs / 1000} seconds...`);
            await delay(delayMs);
            return retryRequest(callback, retries - 1, delayMs);
        } else {
            throw error;
        }
    }
};
const PDFDocument = require('pdfkit');

async function generatePDFReport(chatDetailsArray, analysisText, barChartImage, pieChartImage) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const pdfBuffer = [];

        doc.on('data', chunk => pdfBuffer.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(pdfBuffer)));
        doc.on('error', reject);

        // Title
        doc.fontSize(20).text('Chat Analysis Report', { align: 'center' });
        doc.moveDown();

        // Chat Summary
        doc.fontSize(12).text('Total chats analyzed: ' + chatDetailsArray.length);
        doc.moveDown();

        // Add the analysis insights
        doc.text('Analysis Insights:', { underline: true });
        doc.moveDown();
        doc.text(analysisText, { align: 'left' });
        doc.moveDown(2);

        // Insert Bar Chart
        if (barChartImage) {
            doc.addPage();
            doc.text('Bar Chart Representation', { align: 'center' });
            doc.image(barChartImage, {
                fit: [500, 300],
                align: 'center',
                valign: 'center',
            });
        }

        // Insert Pie Chart
        if (pieChartImage) {
            doc.addPage();
            doc.text('Pie Chart Representation', { align: 'center' });
            doc.image(pieChartImage, {
                fit: [500, 300],
                align: 'center',
                valign: 'center',
            });
        }

        // Finalize the PDF
        doc.end();
    });
}

// Generate a report and perform analysis
app.get("/api/generate-report",ClerkExpressRequireAuth(), async (req, res) => {
    const userId = req.auth.userId;
    console.warn("Generating report for user:", userId);

    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const userChats = await UserChats.findOne({ userId });

        if (!userChats || !userChats.chats.length) {
            return res.status(404).send("No chats found for the user.");
        }

        const chatDetailsArray = [];

        for (let chat of userChats.chats) {
            const chatDetails = await Chat.findOne({
                _id: chat._id,
                userId,
                createdAt: {
                    $gte: firstDayOfMonth,
                    $lte: lastDayOfMonth,
                },
            });

            if (chatDetails) {
                const textData = chatDetails.history.map((entry) => {
                    return entry.parts.map((part) => part.text);
                });
                chatDetailsArray.push({
                    chatId: chat._id,
                    text: textData.flat(),
                });
            }
        }


        if (chatDetailsArray.length === 0) {
            return res.status(404).send("No chats found for the current month.");
        }

        const analysisPrompt = `
       Please analyze the following chat history. Provide the following insights:
       1. Common themes in the conversations.
       2. Weaknesses or areas where the user could improve.
       3. Positive aspects or strengths of the user in the chats.
       4. Suggestions for improvement based on the content of the chats.
       5. Issue measurement shown.
       6. Suggestions for practice coding.
       Chat History: ${JSON.stringify(chatDetailsArray)}
       `;

        // Step 2: Generate the analysis using Google Generative AI (or another language model)
        const result = await model.generateContent(analysisPrompt);
        const analysisText = result.response.text();
        console.log(analysisText);
        console.log("Generating PDF...");
         // Generate charts (if needed, ensure `generateBarChartImage` and `generatePieChartImage` return valid buffers)
         const barChartImage = await generateBarChartImage(chatDetailsArray);
         const pieChartImage = await generatePieChartImage(chatDetailsArray);
        const pdfBuffer = await generatePDFReport(chatDetailsArray, analysisText, barChartImage, pieChartImage);

        console.log("PDF generated. Buffer size:", pdfBuffer.length);

        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error("PDF generation resulted in an empty buffer");
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="chat_analysis_report.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
        console.log("PDF sent to client successfully");
    } catch (err) {
        console.error("Error generating report:", err);
        res.status(500).send("Error generating report.");
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

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(401).send("Unauthenticated!");
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connect();
});

