
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../src/db/users.models.js';

dotenv.config({ path: './.env' });

const makeAdmin = async () => {
    try {
        if (process.argv.length < 3) {
            console.log('Usage: node scripts/makeAdmin.js <email>');
            process.exit(1);
        }

        const email = process.argv[2];
        await mongoose.connect(process.env.DB_URI);
        console.log('Connected to DB');

        const user = await User.findOne({ email });
        if (!user) {
            console.log(`User with email ${email} not found.`);
            process.exit(1);
        }

        user.role = 'admin';
        await user.save({ validateBeforeSave: false });
        console.log(`Successfully promoted ${user.fullName} (${user.email}) to ADMIN.`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

makeAdmin();
