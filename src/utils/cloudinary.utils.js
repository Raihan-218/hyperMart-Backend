import fs from 'fs';
import cloudinary from '../config/cloudinary.config.js'

export const uploadOnCloudinary = async (localFilePath) => {

    try {
        if (!localFilePath)
            return null

        const response = await cloudinary.uploader.upload(localFilePath, { resource_type: "image" })

        fs.unlinkSync(localFilePath)

        return {
            public_id: response.public_id,
            url: response.secure_url
        }
    } catch (error) {
        console.log("CLOUDINARY ERROR : ", error);
        if (fs.existsSync(localFilePath))
            fs.unlinkSync(localFilePath)
        return null;
    }
}


export const deleteOnCloudinary = async(public_id) => {

    await cloudinary.uploader.destroy(public_id);
    
}