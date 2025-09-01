import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

console.log('GMAIL_CLIENT_ID:', process.env.GMAIL_CLIENT_ID);
console.log('GMAIL_CLIENT_SECRET:', process.env.GMAIL_CLIENT_SECRET?.substring(0, 10) + '...');
console.log('GMAIL_DEMO_MODE:', process.env.GMAIL_DEMO_MODE);
console.log('GMAIL_REFRESH_TOKEN:', process.env.GMAIL_REFRESH_TOKEN);