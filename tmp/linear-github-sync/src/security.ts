// @ts-nocheck
import { createHmac, timingSafeEqual } from 'node:crypto';
export function verifySignature(body, signature, secret) {
    if (!signature || !secret) return false;
    const match = /^(?:sha256=)?([a-f0-9]{64})$/i.exec(signature);
    if (!match) return false;
    const expected = createHmac('sha256', secret).update(body).digest();
    const supplied = Buffer.from(match[1], 'hex');
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
