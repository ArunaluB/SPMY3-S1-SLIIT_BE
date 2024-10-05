const { createCanvas } = require('canvas');
const Chart = require('chart.js/auto');

function extractTopics(text) {
    const commonProgrammingTopics = ['JavaScript', 'Python', 'Java', 'C++', 'HTML', 'CSS', 'React', 'Node.js', 'Database', 'API'];
    return commonProgrammingTopics.filter(topic => text.toLowerCase().includes(topic.toLowerCase()));
}

function prepareChatFrequencyData(chatDetailsArray) {
    const frequencyMap = chatDetailsArray.reduce((acc, chat) => {
        const week = getWeekNumber(new Date(chat.createdAt));
        acc[week] = (acc[week] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(frequencyMap).map(([week, count]) => ({
        name: `Week ${week}`,
        chats: count
    }));
}

function prepareTopicDistribution(topicCounts) {
    return Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }));
}

function getWeekNumber(date) {
    const firstDayOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    return Math.ceil((date - firstDayOfMonth) / (7 * 24 * 60 * 60 * 1000));
}

async function generateBarChartImage(data) {
    const canvas = createCanvas(400, 200);
    const ctx = canvas.getContext('2d');
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.name),
            datasets: [{
                label: 'Number of Chats',
                data: data.map(d => d.chats),
                backgroundColor: 'rgba(75, 192, 192, 0.6)'
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    return canvas.toDataURL();
}

async function generatePieChartImage(data) {
    const canvas = createCanvas(400, 200);
    const ctx = canvas.getContext('2d');
    
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.map(d => d.name),
            datasets: [{
                data: data.map(d => d.value),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)'
                ]
            }]
        }
    });

    return canvas.toDataURL();
}

module.exports = {
    extractTopics,
    prepareChatFrequencyData,
    prepareTopicDistribution,
    generateBarChartImage,
    generatePieChartImage
};