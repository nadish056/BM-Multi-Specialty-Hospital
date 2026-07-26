const serverless = require('serverless-http');
const app = require('../../server/server.js');

const handler = serverless(app);

module.exports.handler = async (event, context) => {
    // Netlify redirects /api/* → /.netlify/functions/api/*
    // We rewrite the path back to /api/* so Express routes match correctly
    if (event.path) {
        event.path = event.path.replace(/^\/.netlify\/functions\/api/, '/api') || '/api';
    }
    if (event.rawPath) {
        event.rawPath = event.rawPath.replace(/^\/.netlify\/functions\/api/, '/api') || '/api';
    }
    return handler(event, context);
};
