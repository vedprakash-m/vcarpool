module.exports = async function (context, req) {
    context.log('Simple health check triggered');
    
    // Set response
    context.res = {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            status: "healthy",
            timestamp: new Date().toISOString(),
            message: "Simple health check working"
        })
    };
};
