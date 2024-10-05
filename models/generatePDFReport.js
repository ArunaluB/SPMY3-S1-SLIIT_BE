// Change the require of @react-pdf/renderer to dynamic import
async function generatePDFReport(chatDetailsArray, analysisText, barChartImage, pieChartImage) {
    // Dynamically import @react-pdf/renderer since it's an ES module
    const { Document, Page, Text, View, StyleSheet, Image, Font } = await import('@react-pdf/renderer');
    
    const PDFDocument = require('pdfkit'); // This can still use require since it's not an ES Module

    const doc = new PDFDocument();

    // Set up PDF stream (in this case, it's to a file. You can stream it to the response object instead)
    const pdfBuffer = [];
    doc.on('data', pdfBuffer.push.bind(pdfBuffer));
    doc.on('end', () => Buffer.concat(pdfBuffer));

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

    // Finalize the PDF and return the buffer
    doc.end();
    return Buffer.concat(pdfBuffer); // Return the complete buffer
}

module.exports = generatePDFReport;
