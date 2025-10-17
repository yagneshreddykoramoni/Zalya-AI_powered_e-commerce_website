require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Admin = require('./models/Admin');

async function createAdminUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const adminEmail = 'admin@example.com';

        let adminRecord = await Admin.findOne({ email: adminEmail });
        const legacyAdminUser = await User.findOne({ email: adminEmail });

        if (legacyAdminUser) {
            if (adminRecord) {
                await User.deleteOne({ _id: legacyAdminUser._id });
                console.log('Removed legacy admin record from users collection');
            } else {
                adminRecord = new Admin({
                    name: legacyAdminUser.name || 'Admin',
                    email: adminEmail,
                    password: legacyAdminUser.password,
                    registrationDate: legacyAdminUser.registrationDate || new Date()
                });

                await adminRecord.save();
                await User.deleteOne({ _id: legacyAdminUser._id });
                console.log('Migrated legacy admin record to admin collection');
            }
        }

        if (!adminRecord) {
            adminRecord = new Admin({
                name: 'Admin',
                email: adminEmail,
                password: 'admin123',
                registrationDate: new Date()
            });

            await adminRecord.save();
            console.log('Admin user created successfully');
        } else {
            console.log('Admin user already exists');
        }
        mongoose.connection.close();
    } catch (error) {
        console.error('Error creating admin user:', error);
        mongoose.connection.close();
    }
}

createAdminUser();
