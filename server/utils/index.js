function encodeBase64(payload){
    return new Buffer(payload).toString('base64');
}

module.exports = {
    encodeBase64
}