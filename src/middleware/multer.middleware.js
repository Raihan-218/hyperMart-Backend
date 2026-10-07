import multer from "multer";
const storage = multer.diskStorage({
    destination: function(req , file , cb){
        cb(null , "./public")
    },
    filename: function(req , file ,cb){
        cb(null ,Date.now() + "-" + file.originalname);
    }
})


export const upload = multer({
    storage,
    fileFilter: (req, file, callback) => {
        if (!file.mimetype?.startsWith("image/")) {
            return callback(new Error("Only image files are allowed"));
        }
        return callback(null, true);
    }
});

export const uploadProductImages = (req, res, next) => {
    upload.array("images", 5)(req, res, (error) => {
        if (error) {
            return res.status(400).json({
                message: error.message === "Only image files are allowed"
                    ? error.message
                    : "Unable to process product images. Select up to 5 image files."
            });
        }
        return next();
    });
};