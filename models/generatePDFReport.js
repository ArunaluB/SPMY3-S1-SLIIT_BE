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