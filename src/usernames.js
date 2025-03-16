async function decrypt(encryptedData, password) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Split the encrypted data into Base64 IV and ciphertext
    const [base64Iv, base64Ciphertext] = encryptedData.split(':');
    
    // Convert Base64 to Uint8Array
    const iv = new Uint8Array(atob(base64Iv).split('').map(c => c.charCodeAt(0)));
    const ciphertext = new Uint8Array(atob(base64Ciphertext).split('').map(c => c.charCodeAt(0)));

    // Derive a key using PBKDF2 from the password
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),  // Convert the password into a byte array
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    // Derive a 256-bit AES key using PBKDF2 (same parameters as encryption)
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: encoder.encode('unique_salt'),  // Same salt used for key derivation
            iterations: 100000,
            hash: 'SHA-256',
        },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );

    try {
        // Decrypt the ciphertext using AES-GCM
        const decryptedContent = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            ciphertext
        );

        // Decode the decrypted content back to a string
        return decoder.decode(decryptedContent);
    } catch (error) {
        console.error("Decryption failed:", error);
        throw new Error('Decryption failed');
    }
}

// Example Usage
const encryptedData = 'BASE64IV:Base64Ciphertext';  // Replace with actual encrypted data
const password = 'your-encryption-password';  // The password used for encryption

decrypt(encryptedData, password).then(decryptedText => {
    console.log('Decrypted Text:', decryptedText);
}).catch(error => {
    console.error('Decryption error:', error);
});
