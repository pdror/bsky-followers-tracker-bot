import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(); // Carregar as variáveis de ambiente

const connectDB = async () => {
    console.log(process.env.MONGO_URI);
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log(`Connected to MongoDB: ${mongoose.connection.host}`);
    } catch (err) {
        console.error(`Error connecting to MongoDB: ${err}`);
        process.exit(1); // Encerra o processo se a conexão falhar
    }
};

export default connectDB;