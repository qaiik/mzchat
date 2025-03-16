const CRYPT = {}

// Helper function to encode array buffers as Base64
CRYPT.BufferToB64 = function arrayBufferToBase64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

// Helper function to decode Base64 to array buffer
CRYPT.B64ToBuffer = function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const length = binaryString.length;
    const buffer = new ArrayBuffer(length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < length; i++) {
        view[i] = binaryString.charCodeAt(i);
    }
    return buffer;
}


CRYPT.Session = async function() {
    const key = await crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256,
        },
        true, 
        ["encrypt", "decrypt"]
    );
    return key;
}

CRYPT.EncryptSession = async function encryptSessionKey(sessionKey, publicKey) {
    // Export the session key as raw bytes
    const exportedSessionKey = await crypto.subtle.exportKey("raw", sessionKey);
    
    // Encrypt the session key with the recipient's RSA public key
    const encryptedSessionKey = await crypto.subtle.encrypt(
        {
            name: "RSA-OAEP",
        },
        publicKey,
        exportedSessionKey
    );

    return encryptedSessionKey;
}

CRYPT.DecryptSession = async function decryptSessionKey(encryptedSessionKey, privateKey) {
    const decryptedSessionKey = await crypto.subtle.decrypt(
        {
            name: "RSA-OAEP",
        },
        privateKey,
        encryptedSessionKey
    );

    // Import the decrypted session key as an AES key
    const sessionKey = await crypto.subtle.importKey(
        "raw",
        decryptedSessionKey,
        {
            name: "AES-GCM",
        },
        false,
        ["encrypt", "decrypt"]
    );
    
    return sessionKey;
}

CRYPT.KeyPair = async function generateKeyPair() {
    const keyPair = await crypto.subtle.generateKey(
        {
            name: "RSA-OAEP",
            modulusLength: 2048, 
            publicExponent: new Uint8Array([1, 0, 1]), 
            hash: "SHA-256",
        },
        true, 
        ["encrypt", "decrypt"]
    );
    return keyPair;
}

CRYPT.EncryptMessage = async function encryptMessage(message, sessionKey) {
    // 1. Encode the message as bytes using TextEncoder
    const encoder = new TextEncoder();
    const encodedMessage = encoder.encode(message);

    // 2. Generate a random initialization vector (IV) for AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12)); // AES-GCM requires a 12-byte IV

    // 3. Encrypt the message using AES-GCM with the provided session key
    const encryptedMessage = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        sessionKey,  // Use the provided sessionKey for encryption
        encodedMessage
    );

    // 4. Encode the encrypted message and IV in Base64 for easier transmission
    const encryptedMessageBase64 = CRYPT.BufferToB64(encryptedMessage);
    const ivBase64 = CRYPT.BufferToB64(iv);

    // Return the encrypted message and IV as Base64 strings
    return {
        encryptedMessage: encryptedMessageBase64,
        iv: ivBase64
    };
}

CRYPT.DecryptMessage = async function decryptMessage(encryptedMessageBase64, ivBase64, sessionKey) {
    // 1. Decode the Base64-encoded message and IV
    const encryptedMessage = CRYPT.B64ToBuffer(encryptedMessageBase64);
    const iv = CRYPT.B64ToBuffer(ivBase64);

    // 2. Decrypt the message using AES-GCM and the provided session key
    const decryptedMessage = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        sessionKey,  // Use the passed sessionKey
        encryptedMessage
    );

    // 3. Decode the message from ArrayBuffer to string
    const decoder = new TextDecoder();
    const decodedMessage = decoder.decode(decryptedMessage);

    return decodedMessage;
}

CRYPT.KeyToB64 = async function(publicKey) {
    const exportedKey = await crypto.subtle.exportKey("spki", publicKey);
    return CRYPT.BufferToB64(exportedKey);
}

CRYPT.B64ToKey = async function importPublicKey(base64PublicKey) {
    // Convert the Base64-encoded key to ArrayBuffer
    const publicKeyBuffer = CRYPT.B64ToBuffer(base64PublicKey);

    try {
        const publicKey = await crypto.subtle.importKey(
            "spki", 
            publicKeyBuffer, 
            { name: "RSA-OAEP", hash: "SHA-256" }, 
            true, 
            ["encrypt"] 
        );
        return publicKey;
    } catch (error) {
        console.error("Error importing public key:", error);
    }
};