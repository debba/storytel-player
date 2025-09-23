const crypto = require('crypto');

const KEY = 'VQZBJ6TD8M9WBUWT';
const IV = 'joiwef08u23j341a';

function encryptPassword(password) {
    const cipher = crypto.createCipheriv('aes-128-cbc', KEY, IV);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted.toUpperCase();
}

module.exports = {
    encryptPassword
};