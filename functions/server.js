
// A simple Netlify Function for a Facebook Messenger chatbot.
// This single file handles webhook verification and message handling.

// Import necessary libraries
const axios = require('axios');

// -------------------------------------------------------------
// This is the main function that Netlify will execute.
// It acts as a webhook handler for both GET and POST requests.
// -------------------------------------------------------------
exports.handler = async (event, context) => {
    // IMPORTANT: Retrieve your tokens from Netlify Environment Variables
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
    const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

    if (!VERIFY_TOKEN || !PAGE_ACCESS_TOKEN) {
        console.error('VERIFY_TOKEN or PAGE_ACCESS_TOKEN is not set in Netlify environment variables.');
        return {
            statusCode: 500,
            body: 'Server not configured with tokens.',
        };
    }

    // Handle GET request for webhook verification
    if (event.httpMethod === 'GET') {
        const query = event.queryStringParameters;
        const mode = query['hub.mode'];
        const token = query['hub.verify_token'];
        const challenge = query['hub.challenge'];

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('Webhook verified successfully!');
            return {
                statusCode: 200,
                body: challenge,
            };
        } else {
            console.error('Webhook verification failed!');
            return {
                statusCode: 403,
                body: 'Verification failed',
            };
        }
    }

    // Handle POST request for receiving messages
    if (event.httpMethod === 'POST') {
        const body = JSON.parse(event.body);

        if (body.object === 'page') {
            for (const entry of body.entry) {
                const webhookEvent = entry.messaging[0];
                const senderId = webhookEvent.sender.id;

                if (webhookEvent.message && webhookEvent.message.text) {
                    const receivedMessage = webhookEvent.message.text;
                    await handleMobilisMessage(senderId, receivedMessage, PAGE_ACCESS_TOKEN);
                }
            }
            return {
                statusCode: 200,
                body: 'EVENT_RECEIVED',
            };
        } else {
            return {
                statusCode: 404,
                body: 'Not a page event',
            };
        }
    }
};

// -------------------------------------------------------------
// The chatbot logic for Mobilis services
// -------------------------------------------------------------
async function handleMobilisMessage(senderId, receivedMessage, pageAccessToken) {
    let responseText;
    const normalizedMessage = receivedMessage.toLowerCase().replace(/\s/g, '');

    if (normalizedMessage.includes('رصيدي') || normalizedMessage.includes('رصيد')) {
        responseText = 'لمعرفة رصيدك، قم بالاتصال بالرقم *22# أو أرسل رسالة فارغة إلى 600. يمكنك أيضاً استخدام تطبيق Mobilis.';
    } else if (normalizedMessage.includes('انترنت') || normalizedMessage.includes('عروض') || normalizedMessage.includes('فورجي')) {
        responseText = 'للاشتراك في عروض الإنترنت، قم بالاتصال بالرقم *600#. ستظهر لك قائمة بالخيارات المتاحة.';
    } else if (normalizedMessage.includes('خدمات') || normalizedMessage.includes('موبيليس')) {
        responseText = 'مرحباً بك في خدمات موبيليس! يمكنك الاستفسار عن رصيدك (*22#) أو عروض الإنترنت (*600#).';
    } else if (normalizedMessage.includes('تعبئة') || normalizedMessage.includes('كيفاشنفليكسي')) {
        responseText = 'يمكنك تعبئة رصيدك باستخدام بطاقة التعبئة عن طريق الاتصال بالرقم *111* ثم إدخال رقم البطاقة. ';
    } else if (normalizedMessage.includes('فلوسي')) {
        responseText = 'لتحويل الرصيد إلى رقم موبيليس آخر، اطلب *111*الرقم*المبلغ#.';
    } else {
        responseText = 'عذراً، لم أفهم طلبك. يمكنك السؤال عن "رصيدي" أو "عروض الإنترنت".';
    }

    await callSendAPI(senderId, responseText, pageAccessToken);
}

// -------------------------------------------------------------
// Function to send a message via Facebook API
// -------------------------------------------------------------
async function callSendAPI(senderId, responseText, pageAccessToken) {
    const requestBody = {
        recipient: { id: senderId },
        message: { text: responseText }
    };

    try {
        await axios.post(
            `https://graph.facebook.com/v19.0/me/messages?access_token=${pageAccessToken}`,
            requestBody,
            { headers: { 'Content-Type': 'application/json' } }
        );
        console.log('Message sent successfully!');
    } catch (error) {
        console.error('Failed to send message:', error.response ? error.response.data : error.message);
    }
}
